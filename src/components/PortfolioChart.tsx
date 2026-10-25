import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder } from 'react-native';
import Svg, {
  Polyline,
  Polygon,
  Line,
  Text as SvgText,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { PortfolioTrajectory } from '../types';
import { theme } from '../constants/theme';
import { TrendingUpIcon, SparklesIcon } from './Icons';

interface PortfolioChartProps {
  trajectory: PortfolioTrajectory | null;
  isLoading: boolean;
}

const CHART_H = 190;
const PADDING = { top: 18, right: 16, bottom: 28, left: 56 };

function formatEurShort(v: number): string {
  if (v >= 1000) return `€${(v / 1000).toFixed(1)}k`;
  return `€${v.toFixed(0)}`;
}

interface DataPoint {
  x: number;
  y: number;
  label: string;
  value: number;
  isForecast: boolean;
  horizon?: number;
}

export default function PortfolioChart({ trajectory, isLoading }: PortfolioChartProps) {
  const width = Dimensions.get('window').width - 32;

  const [activePoint, setActivePoint] = useState<DataPoint | null>(null);

  const chartData = useMemo(() => {
    if (!trajectory) return null;

    const histPrices = trajectory.historical.map((p) => p.totalEur);
    const fcPointsRaw = trajectory.forecast.filter((f) => f.totalPredictedEur > 0);
    const fcPrices = fcPointsRaw.map((f) => f.totalPredictedEur);

    const allPrices = [...histPrices, ...fcPrices];
    if (allPrices.length === 0) return null;

    const rawMin = Math.min(...allPrices);
    const rawMax = Math.max(...allPrices);
    const spread = rawMax - rawMin || rawMax * 0.2 || 1;

    const minY = Math.max(0, Math.floor(rawMin - spread * 0.1));
    const maxY = Math.ceil(rawMax + spread * 0.12);
    const rangeY = maxY - minY || 1;

    const chartW = width - PADDING.left - PADDING.right;
    const chartH = CHART_H - PADDING.top - PADDING.bottom;

    const totalSlots = histPrices.length + fcPointsRaw.length;
    const slotW = chartW / Math.max(totalSlots - 1, 1);

    const toX = (i: number) => PADDING.left + i * slotW;
    const toY = (v: number) =>
      PADDING.top + chartH - ((v - minY) / rangeY) * chartH;

    // Historical points & polygon
    const histCoords = histPrices.map((p, i) => ({ x: toX(i), y: toY(p) }));
    const histPoints = histCoords.map((c) => `${c.x},${c.y}`).join(' ');

    const baseY = toY(minY);
    const histPolyPoints =
      histCoords.length > 0
        ? `${histCoords[0].x},${baseY} ` +
          histPoints +
          ` ${histCoords[histCoords.length - 1].x},${baseY}`
        : '';

    // Forecast coordinates — starts from last historical point
    const fcOffset = Math.max(0, histPrices.length - 1);
    const lastHistCoord = histCoords.length > 0 ? histCoords[histCoords.length - 1] : { x: toX(0), y: toY(0) };

    const fcCoords = [
      lastHistCoord,
      ...fcPointsRaw.map((f, i) => ({
        x: toX(fcOffset + 1 + i),
        y: toY(f.totalPredictedEur),
        horizon: f.horizonMonths,
        value: f.totalPredictedEur,
        allAvailable: f.allModelsAvailable,
      })),
    ];
    const fcPoints = fcCoords.map((c) => `${c.x},${c.y}`).join(' ');

    const fcPolyPoints =
      fcCoords.length > 1
        ? `${fcCoords[0].x},${baseY} ` +
          fcPoints +
          ` ${fcCoords[fcCoords.length - 1].x},${baseY}`
        : '';

    const yTicks = [0, 0.5, 1].map((t) => {
      const val = minY + t * rangeY;
      return {
        y: PADDING.top + (1 - t) * chartH,
        label: formatEurShort(val),
      };
    });

    const xLabels: Array<{ x: number; label: string }> = [];
    if (trajectory.historical.length > 0) {
      xLabels.push({ x: toX(0), label: trajectory.historical[0].date });
      xLabels.push({ x: lastHistCoord.x, label: 'Now' });
    }
    if (fcPointsRaw.length > 0) {
      const last = fcPointsRaw[fcPointsRaw.length - 1];
      xLabels.push({ x: toX(fcOffset + fcPointsRaw.length), label: `+${last.horizonMonths}m` });
    }

    // All touchable points
    const allPoints: DataPoint[] = [
      ...trajectory.historical.map((p, i) => ({
        x: toX(i),
        y: toY(p.totalEur),
        label: p.date,
        value: p.totalEur,
        isForecast: false,
      })),
      ...fcPointsRaw.map((f, i) => ({
        x: toX(fcOffset + 1 + i),
        y: toY(f.totalPredictedEur),
        label: `Forecast +${f.horizonMonths}m`,
        value: f.totalPredictedEur,
        isForecast: true,
        horizon: f.horizonMonths,
      })),
    ];

    const currentTotal = histPrices.length > 0 ? histPrices[histPrices.length - 1] : 0;
    const finalPredicted = fcPrices.length > 0 ? fcPrices[fcPrices.length - 1] : currentTotal;
    const growthPct = currentTotal > 0 ? ((finalPredicted - currentTotal) / currentTotal) * 100 : 0;

    return {
      histPoints,
      histPolyPoints,
      fcPoints,
      fcPolyPoints,
      fcSortedCoords: fcCoords.slice(1),
      yTicks,
      xLabels,
      allPoints,
      currentTotal,
      finalPredicted,
      growthPct,
    };
  }, [trajectory, width]);

  const allPointsRef = useRef<DataPoint[]>([]);
  useEffect(() => {
    if (chartData) {
      allPointsRef.current = chartData.allPoints;
    }
  }, [chartData]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => pickPoint(evt.nativeEvent.locationX),
        onPanResponderMove: (evt) => pickPoint(evt.nativeEvent.locationX),
        onPanResponderRelease: () => {
          setTimeout(() => setActivePoint(null), 2500);
        },
        onPanResponderTerminate: () => setActivePoint(null),
      }),
    []
  );

  function pickPoint(touchX: number) {
    const pts = allPointsRef.current;
    if (pts.length === 0) return;
    let closest = pts[0];
    let minDist = Math.abs(touchX - pts[0].x);
    for (let i = 1; i < pts.length; i++) {
      const d = Math.abs(touchX - pts[i].x);
      if (d < minDist) {
        minDist = d;
        closest = pts[i];
      }
    }
    setActivePoint(closest);
  }

  if (!trajectory && !isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Add minifigures to track your collection trajectory
        </Text>
      </View>
    );
  }

  if (isLoading || !chartData) {
    return <View style={styles.skeleton} />;
  }

  const {
    histPoints,
    histPolyPoints,
    fcPoints,
    fcPolyPoints,
    fcSortedCoords,
    yTicks,
    xLabels,
    currentTotal,
    finalPredicted,
    growthPct,
  } = chartData;

  const displayPoint = activePoint ?? {
    value: currentTotal,
    label: 'Current Collection Value',
    isForecast: false,
    x: 0,
    y: 0,
  };

  const isPositive = growthPct >= 0;

  return (
    <View style={[styles.container, { width }]}>
      {/* ── Header stats bar ────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.scrubberLabel}>
            {activePoint
              ? activePoint.label.toUpperCase()
              : 'PORTFOLIO VALUE'}
          </Text>
          <Text style={styles.scrubberValue}>
            € {displayPoint.value.toFixed(2)}
          </Text>
        </View>

        {fcSortedCoords.length > 0 && (
          <View
            style={[
              styles.growthBadge,
              isPositive ? styles.growthPositive : styles.growthNegative,
            ]}
          >
            <TrendingUpIcon
              size={14}
              color={isPositive ? theme.success : theme.danger}
            />
            <Text
              style={[
                styles.growthText,
                { color: isPositive ? theme.success : theme.danger },
              ]}
            >
              {isPositive ? '+' : ''}
              {growthPct.toFixed(1)}% ({finalPredicted >= currentTotal ? '+' : ''}€{(finalPredicted - currentTotal).toFixed(0)})
            </Text>
          </View>
        )}
      </View>

      {/* ── Chart SVG layer ─────────────────────────────────────────── */}
      <View {...panResponder.panHandlers} style={{ width, height: CHART_H }}>
        <Svg width={width} height={CHART_H}>
          <Defs>
            <LinearGradient id="portHistGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#3dd68c" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#3dd68c" stopOpacity="0.0" />
            </LinearGradient>
            <LinearGradient id="portFcGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#f7c94f" stopOpacity="0.22" />
              <Stop offset="100%" stopColor="#f7c94f" stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <React.Fragment key={i}>
              <Line
                x1={PADDING.left}
                y1={tick.y}
                x2={width - PADDING.right}
                y2={tick.y}
                stroke={theme.border}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.6}
              />
              <SvgText
                x={PADDING.left - 8}
                y={tick.y + 4}
                textAnchor="end"
                fontSize={10}
                fontWeight="500"
                fill={theme.muted}
              >
                {tick.label}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Fills */}
          {histPolyPoints.length > 0 && (
            <Polygon points={histPolyPoints} fill="url(#portHistGrad)" />
          )}
          {fcPolyPoints.length > 0 && (
            <Polygon points={fcPolyPoints} fill="url(#portFcGrad)" />
          )}

          {/* Lines */}
          {histPoints.length > 0 && (
            <Polyline
              points={histPoints}
              fill="none"
              stroke="#3dd68c"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {fcPoints.length > 0 && (
            <Polyline
              points={fcPoints}
              fill="none"
              stroke="#f7c94f"
              strokeWidth={2}
              strokeDasharray="6 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Dots */}
          {fcSortedCoords.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill="#13131a"
              stroke="#f7c94f"
              strokeWidth={2}
            />
          ))}

          {/* Active scrubber */}
          {activePoint && (
            <>
              <Line
                x1={activePoint.x}
                y1={PADDING.top - 6}
                x2={activePoint.x}
                y2={CHART_H - PADDING.bottom}
                stroke={activePoint.isForecast ? '#f7c94f' : '#3dd68c'}
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={7}
                fill={activePoint.isForecast ? '#f7c94f' : '#3dd68c'}
                opacity={0.25}
              />
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={4}
                fill="#ffffff"
                stroke={activePoint.isForecast ? '#f7c94f' : '#3dd68c'}
                strokeWidth={2}
              />
            </>
          )}

          {/* X labels */}
          {xLabels.map((lbl, i) => (
            <SvgText
              key={i}
              x={lbl.x}
              y={CHART_H - 8}
              textAnchor="middle"
              fontSize={10}
              fontWeight="600"
              fill={theme.muted}
            >
              {lbl.label}
            </SvgText>
          ))}
        </Svg>
      </View>

      {/* ── Legend ─────────────────────────────────────────────────── */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#3dd68c' }]} />
          <Text style={styles.legendText}>Historical Portfolio</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#f7c94f' }]} />
          <View style={styles.aiTag}>
            <SparklesIcon size={12} color="#f7c94f" />
            <Text style={styles.legendTextAi}>Projected Growth</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  scrubberLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.muted,
    letterSpacing: 0.5,
  },
  scrubberValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.5,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  growthPositive: {
    backgroundColor: 'rgba(61, 214, 140, 0.12)',
  },
  growthNegative: {
    backgroundColor: 'rgba(247, 96, 79, 0.12)',
  },
  growthText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    height: 120,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    color: theme.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  skeleton: {
    height: 160,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendTextAi: {
    color: '#f7c94f',
    fontSize: 12,
    fontWeight: '600',
  },
});
