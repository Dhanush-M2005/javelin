// javelin-tracker-frontend/src/components/dashboard/SciChart3DComponent.jsx
import React, { useEffect, useRef, useCallback, useState } from "react";
import { generateUniqueColor } from "../../utils/colors";
import { SciChartReact } from "scichart-react";
import {
  SciChart3DSurface,
  NumericAxis3D,
  Vector3,
  OrbitModifier3D,
  MouseWheelZoomModifier3D,
  PointLineRenderableSeries3D,
  XyzDataSeries3D,
} from "scichart";

const SciChart3DComponent = ({ comparisonData, loading, visibility, setVisibility }) => {
  // --- MOVED HERE: SciChart setup calls are now in the component body ---
  // This satisfies the Rules of Hooks for the linter.
  SciChart3DSurface.UseCommunityLicense();
  SciChart3DSurface.useWasmFromCDN();

  const sciChartSurfaceRef = useRef(null);
  const wasmContextRef = useRef(null);

  const latestComparisonDataRef = useRef([]);
  const latestVisibilityRef = useRef({});
  const [lastBounds, setLastBounds] = useState(null);

  const fitCameraToBounds = useCallback((sciChart3DSurface, bounds) => {
    if (!sciChart3DSurface || !bounds) return;

    const { minX, maxX, minY, maxY, minZ, maxZ } = bounds;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);
    const spanZ = Math.max(maxZ - minZ, 1);
    const maxSpan = Math.max(spanX, spanY, spanZ);
    const distanceFactor = 2.6;
    const cameraOffset = maxSpan * distanceFactor;

    sciChart3DSurface.camera.position = new Vector3(
      centerX - cameraOffset,
      centerY + cameraOffset * 1.1,
      centerZ - cameraOffset
    );
    sciChart3DSurface.camera.target = new Vector3(centerX, centerY, centerZ);
  }, []);

  const renderSeries = useCallback(
    (sciChart3DSurface, wasmContext) => {
      if (!sciChart3DSurface || !wasmContext) return;
      sciChart3DSurface.renderableSeries.clear();

      let globalMinX = Number.POSITIVE_INFINITY, globalMaxX = Number.NEGATIVE_INFINITY;
      let globalMinY = Number.POSITIVE_INFINITY, globalMaxY = Number.NEGATIVE_INFINITY;
      let globalMinZ = Number.POSITIVE_INFINITY, globalMaxZ = Number.NEGATIVE_INFINITY;

      const compData = latestComparisonDataRef.current || [];
      const vis = latestVisibilityRef.current || {};

      let visibleIndex = 0;
      compData.forEach((throwSession) => {
        if (!vis[throwSession.id]) return;

        const lineSeries3D = new PointLineRenderableSeries3D(wasmContext);
        lineSeries3D.stroke = generateUniqueColor(throwSession.id);
        lineSeries3D.strokeThickness = 3;
        const dataSeries = new XyzDataSeries3D(wasmContext);

        (throwSession.trajectory || []).forEach((point) => {
          const x = point.distance, y = point.height, z = visibleIndex;
          dataSeries.append(x, y, z);
          globalMinX = Math.min(globalMinX, x);
          globalMaxX = Math.max(globalMaxX, x);
          globalMinY = Math.min(globalMinY, y);
          globalMaxY = Math.max(globalMaxY, y);
          globalMinZ = Math.min(globalMinZ, z);
          globalMaxZ = Math.max(globalMaxZ, z);
        });

        lineSeries3D.dataSeries = dataSeries;
        sciChart3DSurface.renderableSeries.add(lineSeries3D);
        visibleIndex++;
      });

      if (visibleIndex > 0 && Number.isFinite(globalMinX)) {
        const bounds = { minX: globalMinX, maxX: globalMaxX, minY: globalMinY, maxY: globalMaxY, minZ: globalMinZ, maxZ: globalMaxZ };
        setLastBounds(bounds);
        fitCameraToBounds(sciChart3DSurface, bounds);
      }
    },
    [fitCameraToBounds]
  );

  const initChart = async (rootElement) => {
    const { sciChart3DSurface, wasmContext } = await SciChart3DSurface.create(rootElement);
    sciChart3DSurface.background = "black";
    sciChart3DSurface.renderSurfaceBorderBrush = "black";

    const axisOptions = {
      axisTitleColor: "white",
      labelStyle: { color: "white" },
      majorLineColor: "white",
      minorLineColor: "white",
      gridBandBrush: "transparent",
    };

    sciChart3DSurface.xAxis = new NumericAxis3D(wasmContext, { ...axisOptions, axisTitle: "Distance (m)" });
    sciChart3DSurface.yAxis = new NumericAxis3D(wasmContext, { ...axisOptions, axisTitle: "Height (m)" });
    sciChart3DSurface.zAxis = new NumericAxis3D(wasmContext, { ...axisOptions, axisTitle: "Throw Comparison" });
    
    sciChart3DSurface.chartModifiers.add(new OrbitModifier3D(), new MouseWheelZoomModifier3D());
    sciChart3DSurface.camera.position = new Vector3(-150, 150, -150);
    sciChart3DSurface.camera.target = new Vector3(40, 7, 0);

    sciChartSurfaceRef.current = sciChart3DSurface;
    wasmContextRef.current = wasmContext;
    renderSeries(sciChart3DSurface, wasmContext);
    return { sciChartSurface: sciChart3DSurface };
  };

  useEffect(() => {
    latestComparisonDataRef.current = comparisonData;
    latestVisibilityRef.current = visibility;
    if (sciChartSurfaceRef.current && wasmContextRef.current) {
      renderSeries(sciChartSurfaceRef.current, wasmContextRef.current);
    }
  }, [comparisonData, visibility, renderSeries]);

  const placeholderHeight = "h-[50vh] lg:h-[500px]";

  if (loading) {
    return <div className={`bg-black p-6 rounded-xl shadow-lg animate-pulse ${placeholderHeight}`}></div>;
  }

  if (!comparisonData || comparisonData.length === 0) {
    return (
      <div className={`bg-black p-6 rounded-xl shadow-lg flex items-center justify-center ${placeholderHeight}`}>
        <p className="text-white text-center">Select one or more throws to see the 3D comparison.</p>
      </div>
    );
  }

  const toggleVisibility = (id) => setVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  const handleResetCamera = () => {
    if (sciChartSurfaceRef.current && lastBounds) {
      fitCameraToBounds(sciChartSurfaceRef.current, lastBounds);
    }
  };

  return (
    <div className="bg-black p-4 sm:p-6 rounded-xl shadow-lg mt-6 flex flex-col" style={{ height: '70vh', minHeight: '500px' }}>
      <h3 className="text-lg sm:text-xl font-semibold mb-4 text-white">
        Comparative Throw Trajectory (3D View)
      </h3>
      <div className="flex-1 min-h-0">
        <SciChartReact initChart={initChart} style={{ width: "100%", height: "100%" }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 sm:gap-3 items-center">
        {comparisonData.map((session) => (
          <button
            key={session.id}
            onClick={() => toggleVisibility(session.id)}
            className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs sm:text-sm font-medium border transition ${
              visibility[session.id] ? "bg-gray-800 border-gray-600 text-white" : "bg-gray-700 border-gray-500 opacity-50 text-white"
            }`}
          >
            <span className="w-3 h-3 sm:w-4 sm:h-4 rounded-full" style={{ backgroundColor: generateUniqueColor(session.id) }}></span>
            <span>{session.id}</span>
          </button>
        ))}
        {lastBounds && (
          <button
            onClick={handleResetCamera}
            className="ml-auto px-4 py-1.5 bg-blue-500 text-white rounded-full text-xs sm:text-sm font-medium hover:bg-blue-600 transition"
          >
            Reset Camera
          </button>
        )}
      </div>
    </div>
  );
};

export default SciChart3DComponent;