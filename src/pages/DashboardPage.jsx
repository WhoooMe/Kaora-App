import React, { useCallback, useEffect, useRef, useState } from "react";
import { C, NM, PERIODS } from "../data.js";
import {
  Icon,
  Badge,
  Legend,
  Tabs,
  DashboardHeroMedia,
  TrendChart,
} from "../ui.jsx";
import KaoraCard from "../components/KaoraCard";
import { Demo, Kpis, HistTable, MaturityFruitIcon } from "./shared.jsx";
import { 
  getDetectionStats, 
  getDetectionTrend, 
  listDetections,
  getDetectionDistributionByBlock 
} from "../api/kaoraApi.js";
import { 
  getCachedWeather, 
  formatTemperature, 
  formatHumidity, 
  formatPrecipitation 
} from "../utils/weatherService.js";

const MATURITY_TO_CHART_CLASS = {
  Immature: "raw",
  Mature: "ok",
  Overmature: "over",
};

const isSupportedMaturityClass = (maturityClass) =>
  Object.prototype.hasOwnProperty.call(MATURITY_TO_CHART_CLASS, maturityClass);

function DashboardDistributionChart({ blocks }) {
  const chartBlocks = blocks.map((block) => {
    const counts = { bad: 0, ok: 0, raw: 0, over: 0 };
    const unknownCounts = Object.create(null);

    Object.entries(block.counts || {}).forEach(([maturityClass, count]) => {
      const chartClass = isSupportedMaturityClass(maturityClass)
        ? MATURITY_TO_CHART_CLASS[maturityClass]
        : null;
      if (chartClass) {
        counts[chartClass] += count;
      } else {
        unknownCounts[maturityClass || "Unknown"] =
          (unknownCounts[maturityClass || "Unknown"] || 0) + count;
      }
    });

    return { block_name: block.block_name, total: block.total, counts, unknownCounts };
  });
  const max = Math.max(1, ...chartBlocks.map((block) => block.total));
  const unknownLabels = [...new Set(chartBlocks.flatMap((block) => Object.keys(block.unknownCounts)))];

  return (
    <div className="dashboard-distribution-chart">
      {chartBlocks.map((block) => (
        <div className="bar" key={block.block_name}>
          <span title={block.block_name}>{block.block_name}</span>
          <div className="tr">
            {["ok", "raw", "over", "bad"].map((chartClass) => {
              const count = block.counts[chartClass];
              return (
                <i
                  key={chartClass}
                  tabIndex={count > 0 ? 0 : -1}
                  style={{ width: `${(count / max) * 100}%`, background: C[chartClass] }}
                  title={`${block.block_name} — ${NM[chartClass]}: ${count} deteksi`}
                  aria-label={`${block.block_name} ${NM[chartClass]} ${count} deteksi`}
                />
              );
            })}
          </div>
          <em>{block.total}</em>
        </div>
      ))}
      <p className="sub">Arahkan kursor ke segmen untuk melihat jumlah per kategori.</p>
      {unknownLabels.length > 0 && (
        <p className="sub dashboard-data-note">
          Kategori kematangan lain tetap tercatat, tetapi tidak digabungkan ke kategori grafik:
          {" "}
          {unknownLabels
            .map((label) => {
              const count = chartBlocks.reduce(
                (total, block) => total + (block.unknownCounts[label] || 0),
                0,
              );
              return `${label} (${count})`;
            })
            .join(", ")}.
        </p>
      )}
    </div>
  );
}

const DashboardPage = ({ go }) => {
  const [period, setPeriod] = useState("7 Hari");
  const trendRequestIdRef = useRef(0);
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [recentDetections, setRecentDetections] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState({ 
    stats: true, 
    trend: true, 
    distribution: true, 
    recent: true, 
    weather: true 
  });
  const [error, setError] = useState({ 
    stats: null, 
    trend: null, 
    distribution: null, 
    recent: null, 
    weather: null 
  });

  // Get current local date in Indonesian format
  const getCurrentLocalDate = () => {
    const now = new Date();
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).format(now);
  };

  const refreshStats = useCallback(async () => {
    setLoading((current) => ({ ...current, stats: true }));
    try {
      const data = await getDetectionStats();
      setStats(data);
      setError((current) => ({ ...current, stats: null }));
    } catch (err) {
      console.error("Failed to load detection stats:", err);
      setError((current) => ({
        ...current,
        stats: err.message || "Gagal memuat statistik deteksi",
      }));
      setStats(null);
    } finally {
      setLoading((current) => ({ ...current, stats: false }));
    }
  }, []);

  const refreshTrend = useCallback(async () => {
    const requestId = ++trendRequestIdRef.current;
    setLoading((current) => ({ ...current, trend: true }));
    try {
      const data = await getDetectionTrend(period);
      if (requestId === trendRequestIdRef.current) {
        setTrend(data);
        setError((current) => ({ ...current, trend: null }));
      }
    } catch (err) {
      console.error(`Failed to load trend for period ${period}:`, err);
      if (requestId === trendRequestIdRef.current) {
        setError((current) => ({
          ...current,
          trend: err.message || "Gagal memuat data tren",
        }));
        setTrend(null);
      }
    } finally {
      if (requestId === trendRequestIdRef.current) {
        setLoading((current) => ({ ...current, trend: false }));
      }
    }
  }, [period]);

  const refreshDistribution = useCallback(async () => {
    setLoading((current) => ({ ...current, distribution: true }));
    try {
      const data = await getDetectionDistributionByBlock();
      setDistribution(data);
      setError((current) => ({ ...current, distribution: null }));
    } catch (err) {
      console.error("Failed to load distribution:", err);
      setError((current) => ({
        ...current,
        distribution: err.message || "Gagal memuat distribusi per blok",
      }));
      setDistribution(null);
    } finally {
      setLoading((current) => ({ ...current, distribution: false }));
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    refreshTrend();
    return () => {
      trendRequestIdRef.current += 1;
    };
  }, [refreshTrend]);

  useEffect(() => {
    refreshDistribution();
  }, [refreshDistribution]);

  // Load recent detections
  useEffect(() => {
    const loadRecent = async () => {
      try {
        const data = await listDetections({ limit: 5 });
        setRecentDetections(data.items || []);
        setError(prev => ({ ...prev, recent: null }));
      } catch (err) {
        console.error("Failed to load recent detections:", err);
        setError(prev => ({ ...prev, recent: err.message || "Gagal memuat riwayat terkini" }));
        setRecentDetections([]);
      } finally {
        setLoading(prev => ({ ...prev, recent: false }));
      }
    };
    loadRecent();
  }, []);

  // Load weather data
  useEffect(() => {
    const loadWeather = async () => {
      try {
        const weatherData = await getCachedWeather();
        
        if (weatherData.success) {
          setWeather(weatherData.data);
          setError(prev => ({ ...prev, weather: null }));
        } else {
          throw new Error("Gagal memuat data cuaca dari Open-Meteo");
        }
      } catch (err) {
        console.error("Failed to load weather:", err);
        setError(prev => ({ ...prev, weather: err.message || "Gagal memuat data cuaca" }));
        setWeather(null);
      } finally {
        setLoading(prev => ({ ...prev, weather: false }));
      }
    };

    loadWeather();
    
    // Refresh weather every 15 minutes
    const interval = setInterval(loadWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Map API maturity classes to chart classes
  const mapMaturityClass = (apiClass) => {
    switch(apiClass) {
      case "Immature": return "raw";
      case "Mature": return "ok";
      case "Overmature": return "over";
      default: return "raw";
    }
  };

  // Format trend data for the chart
  const getTrendChartData = () => {
    if (!trend || !trend.trend || trend.trend.length === 0) {
      return { series: null, labels: [] };
    }

    // Initialize series with zeros for all chart classes
    const seriesData = {
      bad: Array(trend.trend.length).fill(0),
      ok: Array(trend.trend.length).fill(0),
      raw: Array(trend.trend.length).fill(0),
      over: Array(trend.trend.length).fill(0),
    };
    const unknownCounts = Object.create(null);

    const timeZone = trend.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const labels = trend.trend.map((item) => {
      const date = new Date(item.bucket);
      if (period === "24 Jam") {
        return item.label;
      } else if (period === "7 Hari") {
        return new Intl.DateTimeFormat("id-ID", {
          weekday: "short",
          timeZone,
        }).format(date);
      } else if (period === "30 Hari") {
        return new Intl.DateTimeFormat("id-ID", {
          day: "numeric",
          month: "short",
          timeZone,
        }).format(date);
      } else {
        return new Intl.DateTimeFormat("id-ID", {
          month: "short",
          year: "2-digit",
          timeZone,
        }).format(date);
      }
    });
    const tooltipLabels = trend.trend.map((item) => {
      const date = new Date(item.bucket);
      return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        ...(period === "24 Jam" ? { timeStyle: "short" } : {}),
        timeZone,
      }).format(date);
    });

    trend.trend.forEach((item, index) => {
      Object.entries(item.counts || {}).forEach(([apiClass, count]) => {
        const chartClass = isSupportedMaturityClass(apiClass)
          ? MATURITY_TO_CHART_CLASS[apiClass]
          : null;
        if (chartClass) {
          seriesData[chartClass][index] += count;
        } else {
          const label = apiClass || "Unknown";
          unknownCounts[label] = (unknownCounts[label] || 0) + count;
        }
      });
    });

    return {
      series: seriesData,
      labels,
      tooltipLabels,
      unknownCounts,
      unknownTotal: Object.values(unknownCounts).reduce((total, count) => total + count, 0),
    };
  };

  const getKpiData = () => {
    if (!stats) {
      return { total: null, ok: null, harv: null, raw: null, over: null, bad: null };
    }

    return {
      total: stats.total_detections,
      ok: stats.mature_count,
      harv: null,
      raw: stats.immature_count,
      over: stats.overmature_count,
      bad: null,
    };
  };

  const unknownMaturityEntries = Object.entries(stats?.maturity_distribution || {})
    .filter(([maturityClass]) => !isSupportedMaturityClass(maturityClass));
  const trendChartData = trend ? getTrendChartData() : null;

  // Format recent detections for history table
  const getRecentDetectionRows = () => {
    if (!recentDetections || recentDetections.length === 0) {
      return [];
    }

    return recentDetections.map(detection => {
      const date = new Date(detection.created_at);
      const timeStr = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const dayStr = date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      
      const maturityClass = detection.maturity_class || "Unknown";
      const chartClass = mapMaturityClass(maturityClass);
      
      return [
        `${dayStr} ${timeStr}`,
        detection.block_name || "Umum",
        detection.verified ? "Terverifikasi" : "Upload",
        detection.confidence ? Math.round(detection.confidence * 100) : 0,
        chartClass,
      ];
    });
  };

  return (
    <>
      <section className="hero dashboard-hero">
        <DashboardHeroMedia src="/images/hero.jpg" alt="Biji kakao" />
        <div className="shade" />
        <div className="top">
          <div>
            <span className="chip">
              {getCurrentLocalDate()}
            </span>
            <h2>Selamat Datang!!</h2>
            <p>
              Dari rimbunnya kebun hingga buah siap petik, temukan cerita kakao Anda dan nikmati setiap langkah menuju panen terbaik.
            </p>
          </div>
          <div className="glass">
            {loading.weather ? (
              <div className="weather-loading">
                <div className="spinner" style={{ width: "24px", height: "24px" }} />
                <small>Memuat cuaca...</small>
              </div>
            ) : error.weather ? (
              <div style={{ color: "#666", fontSize: "14px" }}>
                <small>Data cuaca tidak tersedia</small>
              </div>
            ) : weather ? (
              <>
                {[
                  ["Suhu", formatTemperature(weather.temperature?.value, weather.temperature?.unit)],
                  ["Kelembapan Udara", formatHumidity(weather.humidity?.value, weather.humidity?.unit)],
                  ["Curah Hujan", formatPrecipitation(weather.precipitation?.value, weather.precipitation?.unit)],
                ].map(([label, value], index) => (
                  <div key={index}>
                    <small>{label}</small>
                    <b>{value}</b>
                  </div>
                ))}
              </>
            ) : null}
          </div>
        </div>
        <div className="strip dashboard-strip">
          <div className="nm">
            <small>Kebun terpilih</small>
            <b>
              Kebun Sumber Rejeki <Demo />
            </b>
          </div>
          <div>
            <small>Luas kebun</small>
            <b>2,4 ha</b>
          </div>
          <div>
            <small>Panen siap</small>
            <b style={{ color: C.ok }}>{stats?.mature_count || 0}</b>
          </div>
          <div className="dashboard-camera-status">
            <small>Status video kamera</small>
            <b>Live feed tidak tersedia</b>
          </div>
          <button className="btn lime" onClick={() => go("deteksi")}>
            <Icon n="scan" />
            Deteksi Kakao
          </button>
        </div>
      </section>

      {/* Statistics card */}
      {loading.stats ? (
        <div className="row">
          <KaoraCard>
            <div className="loading-state">
              <div className="spinner" />
              <p>Memuat statistik deteksi...</p>
            </div>
          </KaoraCard>
        </div>
      ) : error.stats ? (
        <div className="row">
          <KaoraCard>
            <div className="error-state">
              <Icon n="warn" s={24} />
              <h4>Gagal memuat statistik</h4>
              <p>{error.stats}</p>
              <button className="btn secondary" onClick={refreshStats}>
                Coba Lagi
              </button>
            </div>
          </KaoraCard>
        </div>
      ) : stats.total_detections === 0 ? (
        <div className="row">
          <KaoraCard>
            <div className="empty-state dashboard-data-empty">
              <Icon n="hist" s={24} />
              <h4>Belum ada data deteksi</h4>
              <p>Statistik akan muncul setelah deteksi pertama tersimpan.</p>
            </div>
          </KaoraCard>
        </div>
      ) : (
        <div className="dashboard-statistics">
          <Kpis v={getKpiData()} />
          {unknownMaturityEntries.length > 0 && (
            <p className="sub dashboard-data-note">
              Kategori kematangan lain tetap tercakup dalam total, tetapi tidak digabungkan:
              {" "}
              {unknownMaturityEntries
                .map(([label, count]) => `${label} (${count})`)
                .join(", ")}.
            </p>
          )}
        </div>
      )}

      <div className="row r2">
        {/* Trend Chart - Restored visual design */}
        <KaoraCard>
          <div className="hd">
            <div>
              <h3>Tren Kematangan Kakao</h3>
              <p className="sub">
                Jumlah buah terdeteksi per kategori kematangan berdasarkan data riil
              </p>
            </div>
            <Tabs v={period} items={Object.keys(PERIODS)} on={setPeriod} slider />
          </div>
          
          {loading.trend ? (
            <div className="loading-state" style={{ minHeight: "300px" }}>
              <div className="spinner" />
              <p>Memuat data tren...</p>
            </div>
          ) : error.trend ? (
            <div className="error-state" style={{ minHeight: "300px" }}>
              <Icon n="warn" s={24} />
              <h4>Gagal memuat tren</h4>
              <p>{error.trend}</p>
              <button className="btn secondary" onClick={refreshTrend}>
                Coba Lagi
              </button>
            </div>
          ) : trend && trend.total_in_range > 0 ? (
            <>
              <TrendChart
                s={trendChartData.series}
                labels={trendChartData.labels}
                tooltipLabels={trendChartData.tooltipLabels}
              />
              <Legend />
              {trendChartData.unknownTotal > 0 && (
                <p className="dashboard-data-note">
                  Kategori kematangan lain tetap dihitung, tetapi tidak digabungkan ke grafik:
                  {" "}
                  {Object.entries(trendChartData.unknownCounts)
                    .map(([label, count]) => `${label} (${count})`)
                    .join(", ")}.
                </p>
              )}
            </>
          ) : (
            <div className="empty-state" style={{ minHeight: "300px" }}>
              <Icon n="chart" s={24} />
              <h4>Belum ada data tren</h4>
              <p>Tidak ada data deteksi pada periode ini.</p>
            </div>
          )}
        </KaoraCard>

        {/* Distribution Chart - Restored visual design with real data */}
        <KaoraCard>
          <div className="hd">
            <div>
              <h3>Distribusi Buah per Blok</h3>
              <p className="sub">
                Jumlah deteksi menurut blok kebun
              </p>
            </div>
          </div>
          
          {loading.distribution ? (
            <div className="loading-state" style={{ minHeight: "300px" }}>
              <div className="spinner" />
              <p>Memuat distribusi per blok...</p>
            </div>
          ) : error.distribution ? (
            <div className="error-state" style={{ minHeight: "300px" }}>
              <Icon n="warn" s={24} />
              <h4>Gagal memuat distribusi</h4>
              <p>{error.distribution}</p>
              <button className="btn secondary" onClick={refreshDistribution}>
                Coba Lagi
              </button>
            </div>
          ) : distribution && distribution.blocks && distribution.blocks.length > 0 ? (
            <>
              <DashboardDistributionChart blocks={distribution.blocks} />
              <Legend />
              {distribution.no_block_count > 0 && (
                <div className="distribution-note">
                  <small>
                    <Icon n="info" s={12} />
                    {" "}Ada {distribution.no_block_count} deteksi tanpa blok yang tidak ditampilkan
                  </small>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state" style={{ minHeight: "300px" }}>
              <Icon n="block" s={24} />
              <h4>Belum ada data blok</h4>
              <p>
                Belum ada deteksi yang terhubung dengan blok kebun.
                {distribution?.no_block_count > 0
                  ? ` ${distribution.no_block_count} deteksi tersimpan tanpa blok.`
                  : ""}
              </p>
            </div>
          )}
        </KaoraCard>
      </div>

      <div className="row r3">
        {/* Garden Camera Card - Preserving previous design */}
        <KaoraCard>
          <div className="hd">
            <div>
              <h3>Kamera Kebun</h3>
              <p className="sub">Integrasi kamera belum tersedia</p>
            </div>
            <Badge c="off">Belum terintegrasi</Badge>
          </div>
          <div className="dashboard-camera-screen" role="status">
            <b>Preview kamera tidak tersedia</b>
            <small>Live feed belum terintegrasi</small>
          </div>
          <div className="cm">
            <div>
              <b>Kamera Blok A-01</b>
              <small className="mut">Blok A</small>
            </div>
            <div className="dashboard-camera-count">
              <Demo />
            </div>
          </div>
          <div className="phase3e-note">
            <small>
              <Icon n="info" s={14} />
              {" "}Kamera belum terhubung ke sistem
            </small>
            <p>Kamera browser untuk deteksi tersedia di halaman Deteksi Kakao.</p>
          </div>
        </KaoraCard>

        {/* Recent Detections - Restored compact layout */}
        <KaoraCard>
          <div className="hd">
            <div>
              <h3>Riwayat Deteksi Terkini</h3>
              <p className="sub">Data dari database deteksi</p>
            </div>
            <button className="btn ghost" onClick={() => go("riwayat")}>
              Lihat Semua
            </button>
          </div>
          
          {loading.recent ? (
            <div className="loading-state" style={{ minHeight: "200px" }}>
              <div className="spinner" />
              <p>Memuat riwayat terkini...</p>
            </div>
          ) : error.recent ? (
            <div className="error-state" style={{ minHeight: "200px" }}>
              <Icon n="warn" s={24} />
              <h4>Gagal memuat riwayat</h4>
              <p>{error.recent}</p>
            </div>
          ) : recentDetections && recentDetections.length > 0 ? (
            <div className="scroll dashboard-recent-scroll">
              <table className="dashboard-recent-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Blok</th>
                    <th>Sumber</th>
                    <th>Persentase</th>
                    <th>Dominan</th>
                  </tr>
                </thead>
                <tbody>
                  {getRecentDetectionRows().map((row, index) => (
                    <tr key={index}>
                      <td>
                        {row[0]}
                        <small className="mut">Riwayat</small>
                      </td>
                      <td>{row[1]}</td>
                      <td>{row[2]}</td>
                      <td>
                        <b>{row[3]}%</b>
                      </td>
                      <td>
                        <span className="dashboard-dominant">
                          <MaturityFruitIcon maturityClass={row[4]} />
                          <Badge c={row[4]}>
                            {NM[row[4]] || row[4]}
                          </Badge>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Icon n="hist" s={24} />
              <h4>Belum ada data deteksi</h4>
              <p>Lakukan deteksi pertama untuk melihat riwayat di sini.</p>
              <button className="btn primary" onClick={() => go("deteksi")}>
                Mulai Deteksi
              </button>
            </div>
          )}
        </KaoraCard>
      </div>
    </>
  );
};

export default DashboardPage;