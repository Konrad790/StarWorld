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
import { ForecastPoint, MarketSnapshot } from '../types';
import { theme } from '../constants/theme';
import { TrendingUpIcon, SparklesIcon } from './Icons';

interface PriceChartProps {
  snapshots: MarketSnapshot[];
  forecasts: ForecastPoint[];
}

const CHART_H = 210;
const PADDING = { top: 20, right: 16, bottom: 32, left: 56 };

function formatEur(v: number): string {
  if (v >= 1000) return `€${(v / 1000).toFixed(1)}k`;
  return `€${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}`;
}

interface DataPoint {
  x: number;
  y: number;
  label: string;
  price: number;
  isForecast: boolean;
  horizon?: number;
}

export default function PriceChart({ snapshots, forecasts }: PriceChartProps) {
  const width = Dimensions.get('window').width - 32;

  // Active / scrubbed point
  const [activePoint, setActivePoint] = useState<DataPoint | null>(null);

  const chartData = useMemo(() => {
    const histPrices = snapshots.map((s) => s.avgPriceEu ?? 0);
    const fcSorted = [...forecasts]
      .filter((f) => f.modelAvailable && f.predictedPriceEur > 0)
      .sort((a, b) => a.horizonMonths - b.horizonMonths);
    const fcPrices = fcSorted.map((f) => f.predictedPriceEur);

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

    const totalSlots = histPrices.length + fcSorted.length;
    const slotW = chartW / Math.max(totalSlots - 1, 1);

    const toX = (i: number) => PADDING.left + i * slotW;
    const toY = (v: number) =>
      PADDING.top + chartH - ((v - minY) / rangeY) * chartH;

    const snapLabel = (s: MarketSnapshot) => `${s.snapshotYear} H${s.snapshotHalf}`;

    // Historical line coordinates
    const histCoords = histPrices.map((p, i) => ({ x: toX(i), y: toY(p) }));
    const histPoints = histCoords.map((c) => `${c.x},${c.y}`).join(' ');

    // Historical filled gradient polygon
    const baseY = toY(minY);
    const histPolyPoints =
      histCoords.length > 0
        ? `${histCoords[0].x},${baseY} ` +
          histPoints +
          ` ${histCoords[histCoords.length - 1].x},${baseY}`
        : '';

    // Forecast line coordinates — starts from the last historical point for continuity
    const fcOffset = Math.max(0, histPrices.length - 1);
    const lastHistCoord = histCoords.length > 0 ? histCoords[histCoords.length - 1] : { x: toX(0), y: toY(0) };

    const fcCoords = [
      lastHistCoord,
      ...fcSorted.map((f, i) => ({
        x: toX(fcOffset + 1 + i),
        y: toY(f.predictedPriceEur),
        horizon: f.horizonMonths,
        price: f.predictedPriceEur,
      })),
    ];
    const fcPoints = fcCoords.map((c) => `${c.x},${c.y}`).join(' ');

    // Forecast gradient polygon
    const fcPolyPoints =
      fcCoords.length > 1
        ? `${fcCoords[0].x},${baseY} ` +
          fcPoints +
          ` ${fcCoords[fcCoords.length - 1].x},${baseY}`
        : '';

    // Y-axis grid ticks (4 evenly spaced levels)
    const yTicks = [0, 0.33, 0.67, 1].map((t) => {
      const val = minY + t * rangeY;
      return {
        y: PADDING.top + (1 - t) * chartH,
        label: formatEur(val),
      };
    });

    // Milestone X-axis labels
    const xLabels: Array<{ x: number; label: string }> = [];
    if (snapshots.length > 0) {
      xLabels.push({ x: toX(0), label: `${snapshots[0].snapshotYear}` });
      if (snapshots.length > 2) {
        const midIdx = Math.floor(snapshots.length / 2);
        xLabels.push({ x: toX(midIdx), label: `${snapshots[midIdx].snapshotYear}` });
      }
      xLabels.push({ x: lastHistCoord.x, label: 'Now' });
    }
    if (fcSorted.length > 0) {
      const lastFc = fcSorted[fcSorted.length - 1];
      const lastFcX = toX(fcOffset + fcSorted.length);
      xLabels.push({ x: lastFcX, label: `+${lastFc.horizonMonths}m` });
    }

    // All touchable data points
    const allPoints: DataPoint[] = [
      ...snapshots.map((s, i) => ({
        x: toX(i),
        y: toY(s.avgPriceEu ?? 0),
        label: snapLabel(s),
        price: s.avgPriceEu ?? 0,
        isForecast: false,
      })),
      ...fcSorted.map((f, i) => ({
        x: toX(fcOffset + 1 + i),
        y: toY(f.predictedPriceEur),
        label: `+${f.horizonMonths}m (${addMonthsStr(f.horizonMonths)})`,
        price: f.predictedPriceEur,
        isForecast: true,
        horizon: f.horizonMonths,
      })),
    ];

    const currentPrice = histPrices.length > 0 ? histPrices[histPrices.length - 1] : 0;
    const finalPredicted = fcPrices.length > 0 ? fcPrices[fcPrices.length - 1] : currentPrice;
    const totalGrowthPct =
      currentPrice > 0 ? ((finalPredicted - currentPrice) / currentPrice) * 100 : 0;

    return {
      histPoints,
      histPolyPoints,
      fcPoints,
      fcPolyPoints,
      fcSortedCoords: fcCoords.slice(1),
      yTicks,
      xLabels,
      allPoints,
      currentPrice,
      finalPredicted,
      totalGrowthPct,
      lastHistCoord,
    };
  }, [snapshots, forecasts, width]);

  // Keep a ref of all points for pan responder without updating ref in render
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

  if (!chartData || snapshots.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No historical price data available</Text>
      </View>
    );
  }

  const {
    histPoints,
    histPolyPoints,
    fcPoints,
    fcPolyPoints,
    fcSortedCoords,
    yTicks,
    xLabels,
    currentPrice,
    finalPredicted,
    totalGrowthPct,
  } = chartData;

  const displayPoint = activePoint ?? {
    price: currentPrice,
    label: 'Latest Market Price',
    isForecast: false,
    x: 0,
    y: 0,
  };

  const isPositiveGrowth = totalGrowthPct >= 0;

  return (
    <View style={[styles.container, { width }]}>
      {/* ── Dynamic Header / Scrubber Summary ────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.scrubberLabel}>
            {activePoint
              ? activePoint.isForecast
                ? `PROJECTED ${activePoint.label.toUpperCase()}`
                : `HISTORICAL ${activePoint.label.toUpperCase()}`
              : 'MARKET VALUE'}
          </Text>
          <Text style={styles.scrubberPrice}>
            € {displayPoint.price.toFixed(2)}
          </Text>
        </View>

        {chartData.fcSortedCoords.length > 0 && (
          <View
            style={[
              styles.growthBadge,
              isPositiveGrowth ? styles.growthPositive : styles.growthNegative,
            ]}
          >
            <TrendingUpIcon
              size={14}
              color={isPositiveGrowth ? theme.success : theme.danger}
            />
            <Text
              style={[
                styles.growthText,
                { color: isPositiveGrowth ? theme.success : theme.danger },
              ]}
            >
              {isPositiveGrowth ? '+' : ''}
              {totalGrowthPct.toFixed(1)}% ({finalPredicted >= currentPrice ? '+' : ''}€{(finalPredicted - currentPrice).toFixed(1)})
            </Text>
          </View>
        )}
      </View>

      {/* ── SVG Chart Area ───────────────────────────────────────────── */}
      <View {...panResponder.panHandlers} style={{ width, height: CHART_H }}>
        <Svg width={width} height={CHART_H}>
          <Defs>
            {/* Historical blue gradient fill */}
            <LinearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#4f8ef7" stopOpacity="0.28" />
              <Stop offset="100%" stopColor="#4f8ef7" stopOpacity="0.0" />
            </LinearGradient>

            {/* Forecast purple gradient fill */}
            <LinearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#9b6ff7" stopOpacity="0.22" />
              <Stop offset="100%" stopColor="#9b6ff7" stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Horizontal grid lines & Y labels */}
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

          {/* Historical gradient area */}
          {histPolyPoints.length > 0 && (
            <Polygon points={histPolyPoints} fill="url(#histGrad)" />
          )}

          {/* Forecast gradient area */}
          {fcPolyPoints.length > 0 && (
            <Polygon points={fcPolyPoints} fill="url(#fcGrad)" />
          )}

          {/* Historical line */}
          {histPoints.length > 0 && (
            <Polyline
              points={histPoints}
              fill="none"
              stroke="#4f8ef7"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Forecast dashed line */}
          {fcPoints.length > 0 && (
            <Polyline
              points={fcPoints}
              fill="none"
              stroke="#9b6ff7"
              strokeWidth={2}
              strokeDasharray="6 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Forecast point dots */}
          {fcSortedCoords.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill="#13131a"
              stroke="#9b6ff7"
              strokeWidth={2}
            />
          ))}

          {/* Active touch scrubber line & point */}
          {activePoint && (
            <>
              <Line
                x1={activePoint.x}
                y1={PADDING.top - 6}
                x2={activePoint.x}
                y2={CHART_H - PADDING.bottom}
                stroke={activePoint.isForecast ? '#9b6ff7' : '#4f8ef7'}
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={7}
                fill={activePoint.isForecast ? '#9b6ff7' : '#4f8ef7'}
                opacity={0.25}
              />
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={4}
                fill="#ffffff"
                stroke={activePoint.isForecast ? '#9b6ff7' : '#4f8ef7'}
                strokeWidth={2}
              />
            </>
          )}

          {/* X-axis milestone labels */}
          {xLabels.map((lbl, i) => (
            <SvgText
              key={i}
              x={lbl.x}
              y={CHART_H - 10}
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
          <View style={[styles.legendDot, { backgroundColor: '#4f8ef7' }]} />
          <Text style={styles.legendText}>Historical Sales</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: '#9b6ff7', borderWidth: 1, borderColor: '#13131a' },
            ]}
          />
          <View style={styles.aiTag}>
            <SparklesIcon size={12} color="#9b6ff7" />
            <Text style={styles.legendTextAi}>AI Forecast</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function addMonthsStr(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  headerLeft: {
    gap: 2,
  },
  scrubberLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.muted,
    letterSpacing: 0.5,
  },
  scrubberPrice: {
    fontSize: 24,
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
  empty: {
    height: CHART_H,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyText: {
    color: theme.muted,
    fontSize: 14,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
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
  legendDot: {
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
    color: '#9b6ff7',
    fontSize: 12,
    fontWeight: '600',
  },
});
