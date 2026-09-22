import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder } from 'react-native';
import Svg, {
  Polyline,
  Line,
  Text as SvgText,
  Circle,
} from 'react-native-svg';
import { PortfolioTrajectory } from '../types';
import { theme } from '../constants/theme';

interface PortfolioChartProps {
  trajectory: PortfolioTrajectory | null;
  isLoading: boolean;
}

const CHART_H = 180;
const PADDING = { top: 16, right: 16, bottom: 32, left: 56 };

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
}

export default function PortfolioChart({ trajectory, isLoading }: PortfolioChartProps) {
  const width = Dimensions.get('window').width - 32;

  const [tooltip, setTooltip] = useState<DataPoint | null>(null);

  const chartData = useMemo(() => {
    if (!trajectory) return null;

    const histPrices = trajectory.historical.map((p) => p.totalEur);
    const fcPrices = trajectory.forecast
      .filter((f) => f.totalPredictedEur > 0)
      .map((f) => f.totalPredictedEur);

    const allPrices = [...histPrices, ...fcPrices];
    if (allPrices.length === 0) return null;

    const minY = Math.min(...allPrices) * 0.9;
    const maxY = Math.max(...allPrices) * 1.1;
    const rangeY = maxY - minY || 1;

    const chartW = width - PADDING.left - PADDING.right;
    const chartH = CHART_H - PADDING.top - PADDING.bottom;

    const totalSlots = histPrices.length + trajectory.forecast.length;
    const slotW = chartW / Math.max(totalSlots - 1, 1);

    const toX = (i: number) => PADDING.left + i * slotW;
    const toY = (v: number) =>
      PADDING.top + chartH - ((v - minY) / rangeY) * chartH;

    const histPoints = histPrices
      .map((p, i) => `${toX(i)},${toY(p)}`)
      .join(' ');

    const fcOffset = histPrices.length - 1;
    const fcPoints = trajectory.forecast.map((f, i) => ({
      x: toX(fcOffset + 1 + i),
      y: toY(f.totalPredictedEur),
      allAvailable: f.allModelsAvailable,
      horizon: f.horizonMonths,
    }));

    const lastHistX = toX(fcOffset);
    const lastHistY =
      histPrices.length > 0 ? toY(histPrices[histPrices.length - 1]) : 0;
    const connectLine =
      fcPoints.length > 0
        ? `${lastHistX},${lastHistY} ${fcPoints[0].x},${fcPoints[0].y}`
        : '';

    const yTicks = [0, 0.5, 1].map((t) => ({
      y: PADDING.top + (1 - t) * chartH,
      label: formatEurShort(minY + t * rangeY),
    }));

    // All touchable points
    const allPoints: DataPoint[] = [
      ...trajectory.historical.map((p, i) => ({
        x: toX(i),
        y: toY(p.totalEur),
        label: p.date,
        value: p.totalEur,
        isForecast: false,
      })),
      ...trajectory.forecast.map((f, i) => ({
        x: toX(fcOffset + 1 + i),
        y: toY(f.totalPredictedEur),
        label: `+${f.horizonMonths}m`,
        value: f.totalPredictedEur,
        isForecast: true,
      })),
    ];

    return { histPoints, fcPoints, connectLine, yTicks, allPoints };
  }, [trajectory, width]);

  // ── PanResponder ─────────────────────────────────────────────────────────────
  const allPointsRef = useRef<DataPoint[]>([]);
  if (chartData) allPointsRef.current = chartData.allPoints;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => pickPoint(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => pickPoint(evt.nativeEvent.locationX),
      onPanResponderRelease: () => {
        setTimeout(() => setTooltip(null), 1800);
      },
      onPanResponderTerminate: () => setTooltip(null),
    })
  ).current;

  function pickPoint(touchX: number) {
    const pts = allPointsRef.current;
    if (pts.length === 0) return;
    let closest = pts[0];
    let minDist = Math.abs(touchX - pts[0].x);
    for (let i = 1; i < pts.length; i++) {
      const d = Math.abs(touchX - pts[i].x);
      if (d < minDist) { minDist = d; closest = pts[i]; }
    }
    setTooltip(closest);
  }

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (!trajectory && !isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Add minifigures to see your portfolio trajectory
        </Text>
      </View>
    );
  }

  if (isLoading || !chartData) {
    return <View style={styles.skeleton} />;
  }

  const { histPoints, fcPoints, connectLine, yTicks } = chartData;

  const TOOLTIP_W = 110;
  const tooltipLeft = tooltip
    ? Math.min(Math.max(tooltip.x - TOOLTIP_W / 2, 0), width - TOOLTIP_W)
    : 0;
  const tooltipTop = tooltip
    ? Math.max(tooltip.y - 56, PADDING.top)
    : 0;

  return (
    <View style={[styles.container, { width }]}>
      <Text style={styles.title}>Portfolio Trajectory</Text>

      {/* Touch capture layer */}
      <View {...panResponder.panHandlers} style={{ width, height: CHART_H }}>
        <Svg width={width} height={CHART_H}>
          {yTicks.map((tick, i) => (
            <React.Fragment key={i}>
              <Line
                x1={PADDING.left}
                y1={tick.y}
                x2={width - PADDING.right}
                y2={tick.y}
                stroke={theme.border}
                strokeWidth={0.5}
                strokeDasharray="4 4"
              />
              <SvgText
                x={PADDING.left - 4}
                y={tick.y + 4}
                textAnchor="end"
                fontSize={10}
                fill={theme.muted}
              >
                {tick.label}
              </SvgText>
            </React.Fragment>
          ))}

          {histPoints.length > 0 && (
            <Polyline
              points={histPoints}
              fill="none"
              stroke={theme.chart.portfolioHistorical}
              strokeWidth={2}
            />
          )}

          {connectLine && (
            <Polyline
              points={connectLine}
              fill="none"
              stroke={theme.chart.portfolioForecast}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}

          {fcPoints.length > 1 && (
            <Polyline
              points={fcPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={theme.chart.portfolioForecast}
              strokeWidth={2}
              strokeDasharray="5 4"
            />
          )}

          {fcPoints.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={p.allAvailable ? theme.chart.portfolioForecast : 'transparent'}
              stroke={theme.chart.portfolioForecast}
              strokeWidth={1.5}
            />
          ))}

          {/* Active touch crosshair */}
          {tooltip && (
            <>
              <Line
                x1={tooltip.x}
                y1={PADDING.top}
                x2={tooltip.x}
                y2={CHART_H - PADDING.bottom}
                stroke={theme.accent}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <Circle
                cx={tooltip.x}
                cy={tooltip.y}
                r={5}
                fill={tooltip.isForecast ? theme.chart.portfolioForecast : theme.chart.portfolioHistorical}
                stroke={theme.accent}
                strokeWidth={1.5}
              />
            </>
          )}

          {fcPoints.length > 0 && (
            <SvgText
              x={fcPoints[fcPoints.length - 1].x}
              y={CHART_H - 4}
              textAnchor="middle"
              fontSize={9}
              fill={theme.muted}
            >
              {`+${fcPoints[fcPoints.length - 1].horizon}m`}
            </SvgText>
          )}
        </Svg>

        {/* Floating tooltip bubble */}
        {tooltip && (
          <View
            style={[styles.tooltip, { left: tooltipLeft, top: tooltipTop }]}
            pointerEvents="none"
          >
            <Text style={styles.tooltipPrice}>{formatEurShort(tooltip.value)}</Text>
            <Text style={styles.tooltipLabel}>
              {tooltip.isForecast ? `Forecast ${tooltip.label}` : tooltip.label}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: theme.chart.portfolioHistorical }]} />
          <Text style={styles.legendText}>Historical</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: theme.chart.portfolioForecast }]} />
          <Text style={styles.legendText}>Forecast</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  emptyContainer: {
    height: 120,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: theme.surface,
    borderRadius: 12,
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
    height: 120,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 8,
    paddingBottom: 4,
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
    color: theme.muted,
    fontSize: 11,
  },
  tooltip: {
    position: 'absolute',
    width: 110,
    backgroundColor: theme.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  tooltipPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
  },
  tooltipLabel: {
    fontSize: 11,
    color: theme.muted,
    marginTop: 2,
  },
});
