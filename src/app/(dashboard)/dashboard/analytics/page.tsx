"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Eye,
  Users,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  ArrowUpRight,
  Link2,
  Megaphone,
  RefreshCw,
} from "lucide-react";

interface AnalyticsData {
  total_views: number;
  unique_visitors: number;
  daily_chart?: { date: string; views: number }[];
  top_referrers?: { source: string; count: number }[];
  devices?: { device: string; count: number }[];
  browsers?: { browser: string; count: number }[];
  countries?: { country: string; count: number }[];
  campaigns?: { campaign: string; count: number }[];
  tier: string;
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Icon className="h-5 w-5 text-zinc-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniBarChart({ data }: { data: { date: string; views: number }[] }) {
  const maxViews = Math.max(...data.map((d) => d.views), 1);

  return (
    <div className="flex items-end gap-[2px] h-40">
      {data.map((d) => {
        const height = Math.max((d.views / maxViews) * 100, 2);
        return (
          <div key={d.date} className="flex-1 group relative flex flex-col items-center justify-end">
            <div className="hidden group-hover:block absolute -top-8 bg-zinc-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              {d.date}: {d.views} view{d.views !== 1 ? "s" : ""}
            </div>
            <div
              className="w-full bg-blue-500 dark:bg-blue-400 rounded-t-sm hover:bg-blue-600 transition-colors cursor-default"
              style={{ height: `${height}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function DeviceIcon({ device }: { device: string }) {
  switch (device) {
    case "mobile": return <Smartphone className="h-4 w-4" />;
    case "tablet": return <Tablet className="h-4 w-4" />;
    default: return <Monitor className="h-4 w-4" />;
  }
}

function ProgressBar({ value, max, color = "bg-blue-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/stats?days=${days}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load analytics.");
      } else {
        setData(json);
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visitor Analytics</h1>
          <p className="text-zinc-500 mt-1">Track who views your profile.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
          <CardContent className="p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && !data && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 text-zinc-400 animate-spin" />
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Top Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard icon={Eye} label="Total Views" value={data.total_views.toLocaleString()} />
            <StatCard icon={Users} label="Unique Visitors" value={data.unique_visitors.toLocaleString()} />
          </div>

          {/* Free tier upgrade prompt */}
          {data.tier === "free" && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Unlock Full Analytics</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    Upgrade to Pro to see referrers, devices, geography, daily trends, and campaign tracking.
                  </p>
                </div>
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Pro</Badge>
              </CardContent>
            </Card>
          )}

          {/* Pro+ content */}
          {data.tier !== "free" && (
            <>
              {/* Daily Views Chart */}
              {data.daily_chart && data.daily_chart.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-zinc-400" /> Views Over Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <MiniBarChart data={data.daily_chart} />
                    <div className="flex justify-between mt-2 text-xs text-zinc-400">
                      <span>{data.daily_chart[0]?.date}</span>
                      <span>{data.daily_chart[data.daily_chart.length - 1]?.date}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Referrers */}
                {data.top_referrers && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-zinc-400" /> Top Referrers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {data.top_referrers.length === 0 ? (
                        <p className="text-sm text-zinc-400 py-4 text-center">No referrer data yet</p>
                      ) : (
                        <div className="space-y-3">
                          {data.top_referrers.map((r) => (
                            <div key={r.source}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 truncate">
                                  <ArrowUpRight className="h-3 w-3 text-zinc-400 shrink-0" />
                                  {r.source}
                                </span>
                                <span className="text-zinc-500 ml-2 shrink-0">{r.count}</span>
                              </div>
                              <ProgressBar value={r.count} max={data.top_referrers![0].count} />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Devices */}
                {data.devices && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-zinc-400" /> Devices
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {data.devices.length === 0 ? (
                        <p className="text-sm text-zinc-400 py-4 text-center">No device data yet</p>
                      ) : (
                        <div className="space-y-3">
                          {data.devices.map((d) => (
                            <div key={d.device}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-2 capitalize">
                                  <DeviceIcon device={d.device} />
                                  {d.device}
                                </span>
                                <span className="text-zinc-500">{d.count}</span>
                              </div>
                              <ProgressBar
                                value={d.count}
                                max={data.devices![0].count}
                                color={d.device === "desktop" ? "bg-blue-500" : d.device === "mobile" ? "bg-green-500" : "bg-purple-500"}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Browsers */}
                {data.browsers && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Globe className="h-4 w-4 text-zinc-400" /> Browsers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {data.browsers.length === 0 ? (
                        <p className="text-sm text-zinc-400 py-4 text-center">No browser data yet</p>
                      ) : (
                        <div className="space-y-3">
                          {data.browsers.map((b) => (
                            <div key={b.browser}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-zinc-700 dark:text-zinc-300">{b.browser}</span>
                                <span className="text-zinc-500">{b.count}</span>
                              </div>
                              <ProgressBar value={b.count} max={data.browsers![0].count} color="bg-orange-500" />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Countries */}
                {data.countries && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Globe className="h-4 w-4 text-zinc-400" /> Countries
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {data.countries.length === 0 ? (
                        <p className="text-sm text-zinc-400 py-4 text-center">No geographic data yet</p>
                      ) : (
                        <div className="space-y-3">
                          {data.countries.map((c) => (
                            <div key={c.country}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-zinc-700 dark:text-zinc-300">{c.country}</span>
                                <span className="text-zinc-500">{c.count}</span>
                              </div>
                              <ProgressBar value={c.count} max={data.countries![0].count} color="bg-emerald-500" />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* UTM Campaigns */}
              {data.campaigns && data.campaigns.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-zinc-400" /> UTM Campaigns
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {data.campaigns.map((c) => (
                        <div key={c.campaign}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-zinc-700 dark:text-zinc-300 truncate">{c.campaign}</span>
                            <span className="text-zinc-500 ml-2 shrink-0">{c.count}</span>
                          </div>
                          <ProgressBar value={c.count} max={data.campaigns![0].count} color="bg-pink-500" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
