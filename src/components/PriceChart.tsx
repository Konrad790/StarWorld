import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText, Circle } from 'react-native-svg';
import { ForecastPoint, MarketSnapshot } from '../types';
import { theme } from '../constants/theme';

interface PriceChartProps {
  snapshots: MarketSnapshot[];
  forecasts: ForecastPoint[];
}

const CHART_H = 200;
const PADDING = { top: 16, right: 16, bottom: 32, left: 52 };

function formatEur(v: number): string {
  return `€${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}`;
}

// A single touchable data point (historical or forecast)
interface DataPoint {
  x: number;
  y: number;
  label: string;   // period or "+Nm"
  price: number;
  isForecast: boolean;
}

export default function PriceChart({ snapshots, forecasts }: PriceChartProps) {
  const width = Dimensions.get('window').width - 32;

  // ── Tooltip state ────────────────────────────────────────────────────────────
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    price: number;
    isForecast: boolean;
  } | null>(null);

  const chartData = useMemo(() => {
    const histPrices = snapshots.map((s) => s.avgPriceEu ?? 0);
    const fcPrices = forecasts
      .filter((f) => f.modelAvailable && f.predictedPriceEur > 0)
      .map((f) => f.predictedPriceEur);

    const allPrices = [...histPrices, ...fcPrices];
    if (allPrices.length === 0) return null;

    const minY = Math.min(...allPrices) * 0.9;
    const maxY = Math.max(...allPrices) * 1.1;
    const rangeY = maxY - minY || 1;

    const chartW = width - PADDING.left - PADDING.right;
    const chartH = CHART_H - PADDING.top - PADDING.bottom;

    const totalSlots = histPrices.length + forecasts.length;
    const slotW = chartW / Math.max(totalSlots - 1, 1);

    const toX = (i: number) => PADDING.left + i * slotW;
    const toY = (v: number) =>
      PADDING.top + chartH - ((v - minY) / rangeY) * chartH;

    const snapLabel = (s: MarketSnapshot) => `${s.snapshotYear}-H${s.snapshotHalf}`;

    // Historical polyline
    const histPoints = histPrices
      .map((p, i) => `${toX(i)},${toY(p)}`)
      .join(' ');

    // Forecast
    const fcOffset = histPrices.length - 1;
    const fcSorted = [...forecasts].sort((a, b) => a.horizonMonths - b.horizonMonths);
    const fcPoints = fcSorted.map((f, i) => ({
      x: toX(fcOffset + 1 + i),
      y: toY(f.predictedPriceEur),
      modelAvailable: f.modelAvailable,
      price: f.predictedPriceEur,
      horizon: f.horizonMonths,
    }));

    // Connection bridge
    const lastHistX = toX(fcOffset);
    const lastHistY = histPrices.length > 0 ? toY(histPrices[histPrices.length - 1]) : 0;
    const connectLine =
      fcPoints.length > 0
        ? `${lastHistX},${lastHistY} ${fcPoints[0].x},${fcPoints[0].y}`
        : '';

    // Y-axis ticks
    const yTicks = [0, 0.33, 0.67, 1].map((t) => ({
      y: PADDING.top + (1 - t) * chartH,
      label: formatEur(minY + t * rangeY),
    }));

    // X-axis labels
    const xLabels: Array<{ x: number; label: string }> = [];
    if (snapshots.length > 0) {
      xLabels.push({ x: toX(0), label: snapLabel(snapshots[0]) });
      if (snapshots.length > 1) {
        xLabels.push({ x: toX(fcOffset), label: snapLabel(snapshots[snapshots.length - 1]) });
      }
    }
    if (fcPoints.length > 0) {
      const last = fcPoints[fcPoints.length - 1];
      xLabels.push({ x: last.x, label: `+${last.horizon}m` });
    }

    // All touchable data points in order
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
        label: `+${f.horizonMonths}m`,
        price: f.predictedPriceEur,
        isForecast: true,
      })),
    ];

    return { histPoints, fcPoints, connectLine, yTicks, xLabels, allPoints, slotW };
  }, [snapshots, forecasts, width]);

  // ── PanResponder — pick nearest point on touch ────────────────────────────
  const allPointsRef = useRef<DataPoint[]>([]);
  if (chartData) allPointsRef.current = chartData.allPoints;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => pickPoint(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => pickPoint(evt.nativeEvent.locationX),
      onPanResponderRelease: () => {
        // keep tooltip visible for a moment then dismiss
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

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!chartData || snapshots.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No price data available</Text>
      </View>
    );
  }

  const { histPoints, fcPoints, connectLine, yTicks, xLabels } = chartData;

  // Tooltip box positioning — clamp so it never overflows left/right edges
  const TOOLTIP_W = 110;
  const tooltipLeft = tooltip
    ? Math.min(Math.max(tooltip.x - TOOLTIP_W / 2, 0), width - TOOLTIP_W)
    : 0;
  const tooltipTop = tooltip
    ? Math.max(tooltip.y - 56, PADDING.top)
    : 0;

  return (
    <View style={[styles.container, { width }]}>
      {/* Touch capture layer wraps the SVG */}
      <View {...panResponder.panHandlers} style={{ width, height: CHART_H }}>
        <Svg width={width} height={CHART_H}>
          {/* Y-axis grid lines + labels */}
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

          {/* Historical line */}
          {histPoints.length > 0 && (
            <Polyline
              points={histPoints}
              fill="none"
              stroke={theme.chart.historical}
              strokeWidth={2}
            />
          )}

          {/* Connection bridge to forecast */}
          {connectLine && (
            <Polyline
              points={connectLine}
              fill="none"
              stroke={theme.chart.forecast}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}

          {/* Forecast dashed line */}
          {fcPoints.length > 1 && (
            <Polyline
              points={fcPoints.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={theme.chart.forecast}
              strokeWidth={2}
              strokeDasharray="5 4"
            />
          )}

          {/* Forecast data points */}
          {fcPoints.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={p.modelAvailable ? theme.chart.forecast : 'transparent'}
              stroke={theme.chart.forecast}
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
                fill={tooltip.isForecast ? theme.chart.forecast : theme.chart.historical}
                stroke={theme.accent}
                strokeWidth={1.5}
              />
            </>
          )}

          {/* X-axis labels */}
          {xLabels.map((lbl, i) => (
            <SvgText
              key={i}
              x={lbl.x}
              y={CHART_H - 4}
              textAnchor="middle"
              fontSize={9}
              fill={theme.muted}
            >
              {lbl.label}
            </SvgText>
          ))}
        </Svg>

        {/* Floating tooltip bubble */}
        {tooltip && (
          <View
            style={[
              styles.tooltip,
              { left: tooltipLeft, top: tooltipTop },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.tooltipPrice}>{formatEur(tooltip.price)}</Text>
            <Text style={styles.tooltipLabel}>
              {tooltip.isForecast ? `Forecast ${tooltip.label}` : tooltip.label}
            </Text>
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.chart.historical }]} />
          <Text style={styles.legendText}>Historical</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.chart.forecast }]} />
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
    overflow: 'hidden',
  },
  empty: {
    height: CHART_H,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
  },
  emptyText: {
    color: theme.muted,
    fontSize: 14,
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
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: theme.muted,
    fontSize: 12,
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
