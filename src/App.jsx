import { useState, useEffect, useCallback, useMemo } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const PARADIGM_INFO = {
  standard: {
    label: "Standard Multi-Entity",
    desc: "Groups represent regions, LLCs, or districts. Locations are individual sites.",
    groupLabel: "Group",
    locationLabel: "Location",
    groupMapsTo: "Organizational Grouping",
    locationMapsTo: "Store / Location GL Segment",
    example: "Regional grocery chain with stores across districts",
    glSegments: { location: "Auto-fixed by Location", department: "Driven by line-item / category rules" },
  },
  department: {
    label: "Department-as-Location",
    desc: "Groups represent the physical store or property. Locations represent departments within it.",
    groupLabel: "Group (= Store / Property)",
    locationLabel: "Location (= Department)",
    groupMapsTo: "Store / Location GL Segment",
    locationMapsTo: "Department GL Segment",
    example: "Country club, resort, or grocery store with departmental GL coding",
    glSegments: { location: "Auto-fixed by Group", department: "Auto-fixed by Location" },
  },
};

const DEFAULT_CONFIGS = {
  standard: {
    glCodes: { natural: "5100", location: "200", department: "10" },
    groups: [
      { name: "Northeast Region", type: "normal", locations: [
        { name: "Store #101 — Albany", type: "normal" },
        { name: "Store #102 — Hartford", type: "normal" },
        { name: "Store #103 — Boston", type: "normal" },
      ]},
      { name: "Southeast Region", type: "normal", locations: [
        { name: "Store #201 — Atlanta", type: "normal" },
        { name: "Store #202 — Charlotte", type: "normal" },
      ]},
      { name: "To Be Sorted", type: "tbs", locations: [] },
      { name: "Splitting", type: "normal", locations: [
        { name: "Intercompany / Multi-Location", type: "splitting" },
      ]},
    ],
  },
  department: {
    glCodes: { natural: "5100", location: "100", department: "30" },
    groups: [
      { name: "Main Street Market", type: "normal", locations: [
        { name: "Grocery", type: "normal" },
        { name: "Deli & Bakery", type: "normal" },
        { name: "Garden Center", type: "normal" },
        { name: "Pet & Feed", type: "normal" },
      ]},
      { name: "Riverside Resort", type: "normal", locations: [
        { name: "Restaurant", type: "normal" },
        { name: "Spa", type: "normal" },
        { name: "Golf Pro Shop", type: "normal" },
        { name: "Housekeeping", type: "normal" },
      ]},
      { name: "To Be Sorted", type: "tbs", locations: [] },
      { name: "Splitting", type: "normal", locations: [
        { name: "Intercompany / Multi-Location", type: "splitting" },
      ]},
    ],
  },
};

const FLOW_STEPS = [
  { id: "entry", title: "Invoice Enters Ottimate", icon: "📨" },
  { id: "associate", title: "Associated with Location", icon: "📍" },
  { id: "segment", title: "GL Segments Separated", icon: "🧩" },
  { id: "natural", title: "Natural GL Code Applied", icon: "🏷️" },
  { id: "auto", title: "Segments Auto-Fixed", icon: "⚡" },
  { id: "route", title: "Routed for Approval", icon: "🔀" },
  { id: "export", title: "Full GL Reassembled for Export", icon: "📤" },
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function OttimateConfigExplainer() {
  const [paradigm, setParadigm] = useState("standard");
  const [configs, setConfigs] = useState(JSON.parse(JSON.stringify(DEFAULT_CONFIGS)));
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingLoc, setEditingLoc] = useState(null);
  const [showSection, setShowSection] = useState({ hierarchy: true, flow: true, routing: true });
  const [selectedInvoice, setSelectedInvoice] = useState({ groupIdx: 0, locIdx: 0 });

  const info = PARADIGM_INFO[paradigm];
  const config = configs[paradigm];

  const normalGroups = useMemo(() => config.groups.filter(g => g.type === "normal" && g.locations.some(l => l.type === "normal")), [config]);

  useEffect(() => {
    if (!playing) return;
    if (activeStep >= FLOW_STEPS.length - 1) { setPlaying(false); return; }
    const timer = setTimeout(() => setActiveStep(s => s + 1), 2000);
    return () => clearTimeout(timer);
  }, [playing, activeStep]);

  useEffect(() => { setActiveStep(0); setPlaying(false); }, [paradigm]);

  useEffect(() => {
    if (normalGroups.length === 0) return;
    const gIdx = Math.min(selectedInvoice.groupIdx, normalGroups.length - 1);
    const normalLocs = normalGroups[gIdx]?.locations.filter(l => l.type === "normal") || [];
    const lIdx = Math.min(selectedInvoice.locIdx, Math.max(0, normalLocs.length - 1));
    if (gIdx !== selectedInvoice.groupIdx || lIdx !== selectedInvoice.locIdx) {
      setSelectedInvoice({ groupIdx: gIdx, locIdx: lIdx });
    }
  }, [normalGroups, selectedInvoice]);

  const updateGLCode = useCallback((segment, value) => {
    setConfigs(prev => { const next = JSON.parse(JSON.stringify(prev)); next[paradigm].glCodes[segment] = value; return next; });
  }, [paradigm]);

  const updateGroupName = useCallback((gIdx, name) => {
    setConfigs(prev => { const next = JSON.parse(JSON.stringify(prev)); next[paradigm].groups[gIdx].name = name; return next; });
  }, [paradigm]);

  const updateLocName = useCallback((gIdx, lIdx, name) => {
    setConfigs(prev => { const next = JSON.parse(JSON.stringify(prev)); next[paradigm].groups[gIdx].locations[lIdx].name = name; return next; });
  }, [paradigm]);

  const addLocation = useCallback((gIdx, type = "normal") => {
    setConfigs(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const label = type === "splitting" ? "Intercompany / Multi-Location" : "New Location";
      next[paradigm].groups[gIdx].locations.push({ name: label, type });
      return next;
    });
  }, [paradigm]);

  const addGroup = useCallback((type = "normal") => {
    setConfigs(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (type === "tbs") {
        if (next[paradigm].groups.some(g => g.type === "tbs")) return next;
        next[paradigm].groups.push({ name: "To Be Sorted", type: "tbs", locations: [] });
      } else {
        next[paradigm].groups.push({ name: "New Group", type: "normal", locations: [{ name: "Location 1", type: "normal" }] });
      }
      return next;
    });
  }, [paradigm]);

  const removeLocation = useCallback((gIdx, lIdx) => {
    setConfigs(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const g = next[paradigm].groups[gIdx];
      if (g.locations.length > 1 || g.type === "tbs") g.locations.splice(lIdx, 1);
      return next;
    });
  }, [paradigm]);

  const removeGroup = useCallback((gIdx) => {
    setConfigs(prev => { const next = JSON.parse(JSON.stringify(prev)); next[paradigm].groups.splice(gIdx, 1); return next; });
  }, [paradigm]);

  const resetToDefaults = useCallback(() => {
    setConfigs(prev => { const next = JSON.parse(JSON.stringify(prev)); next[paradigm] = JSON.parse(JSON.stringify(DEFAULT_CONFIGS[paradigm])); return next; });
  }, [paradigm]);

  const selGroup = normalGroups[selectedInvoice.groupIdx] || normalGroups[0];
  const selNormalLocs = selGroup?.locations.filter(l => l.type === "normal") || [];
  const selLoc = selNormalLocs[selectedInvoice.locIdx]?.name || selNormalLocs[0]?.name || "";
  const glCodes = config.glCodes;
  const glExample = useMemo(() => ({ natural: glCodes.natural, location: glCodes.location, department: glCodes.department, full: `${glCodes.natural}-${glCodes.location}-${glCodes.department}` }), [glCodes]);
  const hasTbs = config.groups.some(g => g.type === "tbs");
  const hasSplitting = config.groups.some(g => g.locations.some(l => l.type === "splitting"));

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }} className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="bg-blue-600 text-white font-bold text-sm px-2.5 py-1 rounded">OTTIMATE</div>
                <h1 className="text-lg font-bold tracking-tight">Multi-Entity Configuration</h1>
              </div>
              <p className="text-slate-400 text-xs">Interactive guide to location hierarchy, GL segment automation, and approval routing</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-2">Configuration Mode</span>
              <button onClick={() => setParadigm("standard")} className={`px-3 py-1.5 rounded-l-lg text-xs font-semibold transition-all ${paradigm === "standard" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>Standard Multi-Entity</button>
              <button onClick={() => setParadigm("department")} className={`px-3 py-1.5 rounded-r-lg text-xs font-semibold transition-all ${paradigm === "department" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>Department-as-Location</button>
            </div>
          </div>
        </div>
      </div>

      {/* Paradigm Info Bar */}
      <div className={`px-6 py-3 border-b ${paradigm === "standard" ? "bg-blue-50 border-blue-100" : "bg-amber-50 border-amber-100"}`}>
        <div className="max-w-6xl mx-auto flex items-start gap-4">
          <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-lg ${paradigm === "standard" ? "bg-blue-100" : "bg-amber-100"}`}>{paradigm === "standard" ? "🏢" : "🏬"}</div>
          <div className="flex-1">
            <h2 className={`text-sm font-bold ${paradigm === "standard" ? "text-blue-800" : "text-amber-800"}`}>{info.label}</h2>
            <p className={`text-xs mt-0.5 ${paradigm === "standard" ? "text-blue-600" : "text-amber-700"}`}>{info.desc}</p>
            <p className={`text-[10px] mt-1 ${paradigm === "standard" ? "text-blue-400" : "text-amber-500"}`}>Example: {info.example}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] text-slate-500 mb-1">GL Segment Mapping</div>
            <div className="space-y-0.5">
              <div className="text-[10px]"><span className="text-slate-400">Location Segment:</span> <span className="font-semibold text-emerald-600">{info.glSegments.location}</span></div>
              <div className="text-[10px]"><span className="text-slate-400">Department Segment:</span> <span className="font-semibold text-emerald-600">{info.glSegments.department}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* GL String Configuration */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">GL String Configuration</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Define the segment codes that make up your GL string. These flow through the entire visual.</p>
            </div>
            <div className="bg-slate-800 rounded-lg px-4 py-2 font-mono text-white text-sm tracking-wider">
              <span className="text-emerald-400">{glCodes.natural}</span><span className="text-slate-500">-</span>
              <span className="text-blue-400">{glCodes.location}</span><span className="text-slate-500">-</span>
              <span className="text-purple-400">{glCodes.department}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <GLSegmentInput label="Natural GL Code" desc="What was purchased" value={glCodes.natural} onChange={v => updateGLCode("natural", v)} color="emerald" />
            <GLSegmentInput label="Location Segment" desc={paradigm === "standard" ? "Which store / site" : "Which store / property"} value={glCodes.location} onChange={v => updateGLCode("location", v)} color="blue" />
            <GLSegmentInput label="Department Segment" desc="Which department" value={glCodes.department} onChange={v => updateGLCode("department", v)} color="purple" />
          </div>
        </div>

        {/* SECTION 1: Hierarchy Editor */}
        <Section title="Location Hierarchy" subtitle="Configure groups and locations. Click any name to customize." open={showSection.hierarchy} onToggle={() => setShowSection(s => ({ ...s, hierarchy: !s.hierarchy }))} badge={`${config.groups.length} groups · ${config.groups.reduce((a, g) => a + g.locations.length, 0)} locations`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <MappingBadge label={info.groupLabel} mapsTo={info.groupMapsTo} color={paradigm === "standard" ? "blue" : "amber"} />
              <MappingBadge label={info.locationLabel} mapsTo={info.locationMapsTo} color={paradigm === "standard" ? "indigo" : "orange"} />
            </div>
            <button onClick={resetToDefaults} className="text-[10px] text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-300 px-2 py-1 rounded transition-colors">Reset Defaults</button>
          </div>

          <div className="space-y-3">
            {config.groups.map((group, gIdx) => {
              if (group.type === "tbs") {
                return (
                  <div key={gIdx} className="border-2 border-dashed border-amber-300 bg-amber-50/50 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold bg-amber-400 text-white">?</div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-amber-800">To Be Sorted</div>
                        <div className="text-[10px] text-amber-600 mt-0.5">Invoices that couldn't be auto-matched land here for manual assignment</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-600">No GL Mapping</span>
                      <button onClick={() => removeGroup(gIdx)} className="text-slate-300 hover:text-red-500 text-xs transition-colors">✕</button>
                    </div>
                    <div className="mt-3 bg-amber-100/50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-700">
                      <span className="font-bold">How it works:</span> When group routing can't identify the destination via ship-to, customer number, or ZIP, the invoice is placed here. An end user must manually sort it into the correct group and location before processing continues.
                    </div>
                  </div>
                );
              }

              return (
                <div key={gIdx} className={`border-2 rounded-xl p-4 transition-all ${paradigm === "standard" ? "border-blue-200 bg-blue-50/30" : "border-amber-200 bg-amber-50/30"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${paradigm === "standard" ? "bg-blue-500 text-white" : "bg-amber-500 text-white"}`}>{paradigm === "standard" ? "G" : "S"}</div>
                    {editingGroup === `${gIdx}` ? (
                      <input autoFocus className="flex-1 text-sm font-semibold bg-white border border-slate-300 rounded px-2 py-1" value={group.name} onChange={e => updateGroupName(gIdx, e.target.value)} onBlur={() => setEditingGroup(null)} onKeyDown={e => e.key === "Enter" && setEditingGroup(null)} />
                    ) : (
                      <button onClick={() => setEditingGroup(`${gIdx}`)} className="flex-1 text-left text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors">{group.name}<span className="text-[10px] text-slate-400 ml-2">click to edit</span></button>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${paradigm === "standard" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-700"}`}>→ {paradigm === "standard" ? "Org Group" : "Location Segment"}</span>
                    {config.groups.filter(g => g.type === "normal").length > 1 && (
                      <button onClick={() => removeGroup(gIdx)} className="text-slate-300 hover:text-red-500 text-xs transition-colors">✕</button>
                    )}
                  </div>
                  <div className="ml-8 space-y-1.5">
                    {group.locations.map((loc, lIdx) => {
                      if (loc.type === "splitting") {
                        return (
                          <div key={lIdx} className="flex items-center gap-2 group">
                            <div className="w-4 h-px bg-violet-300"></div>
                            <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-violet-500 text-white">⇄</div>
                            {editingLoc === `${gIdx}-${lIdx}` ? (
                              <input autoFocus className="flex-1 text-xs bg-white border border-violet-300 rounded px-2 py-1" value={loc.name} onChange={e => updateLocName(gIdx, lIdx, e.target.value)} onBlur={() => setEditingLoc(null)} onKeyDown={e => e.key === "Enter" && setEditingLoc(null)} />
                            ) : (
                              <button onClick={() => setEditingLoc(`${gIdx}-${lIdx}`)} className="flex-1 text-left text-xs text-violet-700 font-semibold hover:text-violet-900 transition-colors">{loc.name}</button>
                            )}
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-medium">Splitting — Multi-Location Mapping</span>
                            <button onClick={() => removeLocation(gIdx, lIdx)} className="text-slate-200 hover:text-red-400 text-[10px] opacity-0 group-hover:opacity-100 transition-all">✕</button>
                          </div>
                        );
                      }
                      return (
                        <div key={lIdx} className="flex items-center gap-2 group">
                          <div className="w-4 h-px bg-slate-300"></div>
                          <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${paradigm === "standard" ? "bg-indigo-400 text-white" : "bg-orange-400 text-white"}`}>{paradigm === "standard" ? "L" : "D"}</div>
                          {editingLoc === `${gIdx}-${lIdx}` ? (
                            <input autoFocus className="flex-1 text-xs bg-white border border-slate-300 rounded px-2 py-1" value={loc.name} onChange={e => updateLocName(gIdx, lIdx, e.target.value)} onBlur={() => setEditingLoc(null)} onKeyDown={e => e.key === "Enter" && setEditingLoc(null)} />
                          ) : (
                            <button onClick={() => setEditingLoc(`${gIdx}-${lIdx}`)} className="flex-1 text-left text-xs text-slate-700 hover:text-blue-600 transition-colors">{loc.name}</button>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${paradigm === "standard" ? "bg-indigo-50 text-indigo-500" : "bg-orange-50 text-orange-600"}`}>→ {paradigm === "standard" ? "Location Segment" : "Dept Segment"}</span>
                          {group.locations.filter(l => l.type === "normal").length > 1 && (
                            <button onClick={() => removeLocation(gIdx, lIdx)} className="text-slate-200 hover:text-red-400 text-[10px] opacity-0 group-hover:opacity-100 transition-all">✕</button>
                          )}
                        </div>
                      );
                    })}
                    <div className="ml-6 flex gap-3">
                      <button onClick={() => addLocation(gIdx, "normal")} className="text-[10px] text-blue-500 hover:text-blue-700 font-medium">+ Add {paradigm === "standard" ? "Location" : "Department"}</button>
                      {!group.locations.some(l => l.type === "splitting") && (
                        <button onClick={() => addLocation(gIdx, "splitting")} className="text-[10px] text-violet-500 hover:text-violet-700 font-medium">+ Add Splitting Location</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex gap-3">
              <button onClick={() => addGroup("normal")} className="flex-1 py-2 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl text-xs text-slate-400 hover:text-blue-600 font-medium transition-colors">+ Add {paradigm === "standard" ? "Group" : "Store / Property"}</button>
              {!hasTbs && (
                <button onClick={() => addGroup("tbs")} className="py-2 px-4 border-2 border-dashed border-amber-300 hover:border-amber-400 rounded-xl text-xs text-amber-400 hover:text-amber-600 font-medium transition-colors">+ Add "To Be Sorted"</button>
              )}
            </div>
          </div>
        </Section>

        {/* SECTION 2: Invoice Flow */}
        <Section title="Invoice Lifecycle" subtitle="Step through how an invoice flows from entry to ERP export" open={showSection.flow} onToggle={() => setShowSection(s => ({ ...s, flow: !s.flow }))} badge={`Step ${activeStep + 1} of ${FLOW_STEPS.length}`}>
          <div className="bg-slate-50 rounded-lg p-3 mb-5 border border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Simulate Invoice For:</div>
            <div className="flex gap-3 flex-wrap">
              <select className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white" value={selectedInvoice.groupIdx} onChange={e => setSelectedInvoice({ groupIdx: Number(e.target.value), locIdx: 0 })}>
                {normalGroups.map((g, i) => <option key={i} value={i}>{g.name}</option>)}
              </select>
              <select className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white" value={selectedInvoice.locIdx} onChange={e => setSelectedInvoice(s => ({ ...s, locIdx: Number(e.target.value) }))}>
                {selNormalLocs.map((l, i) => <option key={i} value={i}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => { setActiveStep(0); setPlaying(true); }} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">▶ Play All</button>
            <button onClick={() => setActiveStep(s => Math.max(0, s - 1))} disabled={activeStep === 0} className="bg-slate-200 hover:bg-slate-300 disabled:opacity-30 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">← Prev</button>
            <button onClick={() => { setPlaying(false); setActiveStep(s => Math.min(FLOW_STEPS.length - 1, s + 1)); }} disabled={activeStep >= FLOW_STEPS.length - 1} className="bg-slate-200 hover:bg-slate-300 disabled:opacity-30 text-slate-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">Next →</button>
            {playing && <button onClick={() => setPlaying(false)} className="text-xs text-red-500 hover:text-red-700 font-medium">■ Stop</button>}
            <div className="flex-1" />
            <div className="text-[10px] text-slate-400">{FLOW_STEPS[activeStep]?.title}</div>
          </div>
          <div className="flex items-center gap-1 mb-6">
            {FLOW_STEPS.map((step, i) => (
              <button key={i} onClick={() => { setPlaying(false); setActiveStep(i); }} className="flex-1 flex flex-col items-center gap-1 group">
                <div className={`w-full h-1.5 rounded-full transition-all duration-500 ${i <= activeStep ? "bg-blue-500" : "bg-slate-200"} ${i === activeStep ? "h-2.5 shadow-lg shadow-blue-200" : ""}`} />
                <span className={`text-[9px] transition-colors ${i === activeStep ? "text-blue-600 font-bold" : i <= activeStep ? "text-slate-500" : "text-slate-300"}`}>{step.icon}</span>
              </button>
            ))}
          </div>
          <StepDetail step={activeStep} paradigm={paradigm} groupName={selGroup?.name || ""} locName={selLoc} glExample={glExample} info={info} hasTbs={hasTbs} hasSplitting={hasSplitting} />
        </Section>

        {/* SECTION 3: Approval Routing */}
        <Section title="Approval Routing Logic" subtitle="How Ottimate routes invoices to the right approver" open={showSection.routing} onToggle={() => setShowSection(s => ({ ...s, routing: !s.routing }))}>
          <RoutingDiagram paradigm={paradigm} groups={normalGroups} selectedGroup={selectedInvoice.groupIdx} selectedLoc={selectedInvoice.locIdx} />
        </Section>

        <div className="text-center text-[10px] text-slate-400 py-4">Ottimate Multi-Entity Configuration Guide · Confidential</div>
      </div>
    </div>
  );
}

// ─── GL Segment Input ────────────────────────────────────────────────────────
function GLSegmentInput({ label, desc, value, onChange, color }) {
  const styles = {
    emerald: { border: "border-emerald-300", focus: "focus:border-emerald-500 focus:ring-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
    blue: { border: "border-blue-300", focus: "focus:border-blue-500 focus:ring-blue-200", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
    purple: { border: "border-purple-300", focus: "focus:border-purple-500 focus:ring-purple-200", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  }[color];
  return (
    <div className={`${styles.bg} border ${styles.border} rounded-xl p-3`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`w-2 h-2 rounded-full ${styles.dot}`}></div>
        <div className={`text-[10px] font-bold uppercase tracking-wider ${styles.text}`}>{label}</div>
      </div>
      <input className={`w-full text-center font-mono font-bold text-lg bg-white border ${styles.border} ${styles.focus} rounded-lg px-3 py-2 ${styles.text} outline-none transition-colors focus:ring-2`} value={value} onChange={e => onChange(e.target.value)} placeholder="Code" />
      <div className="text-[10px] text-slate-400 text-center mt-1.5">{desc}</div>
    </div>
  );
}

// ─── Section Wrapper ─────────────────────────────────────────────────────────
function Section({ title, subtitle, open, onToggle, badge, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
        <div className="text-left">
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {badge && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{badge}</span>}
          <span className={`text-slate-400 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
        </div>
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-100 pt-4">{children}</div>}
    </div>
  );
}

function MappingBadge({ label, mapsTo, color }) {
  const colors = { blue: "bg-blue-50 border-blue-200 text-blue-700", amber: "bg-amber-50 border-amber-200 text-amber-700", indigo: "bg-indigo-50 border-indigo-200 text-indigo-700", orange: "bg-orange-50 border-orange-200 text-orange-700" };
  return (
    <div className={`border rounded-lg px-3 py-2 ${colors[color]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</div>
      <div className="text-xs font-semibold mt-0.5">→ {mapsTo}</div>
    </div>
  );
}

// ─── Step Detail Card ────────────────────────────────────────────────────────
function StepDetail({ step, paradigm, groupName, locName, glExample, info, hasTbs, hasSplitting }) {
  const stepContent = [
    // Step 0: Entry
    () => (
      <div className="space-y-4">
        <div className="text-sm font-semibold text-slate-800">Two ways invoices can enter Ottimate:</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-2 border-blue-300 bg-blue-50/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xs font-bold">A</div>
              <div><div className="text-[11px] font-bold text-blue-800">Group Routing</div><div className="text-[10px] text-blue-500">Automatic location assignment</div></div>
            </div>
            <div className="space-y-2 mb-3">
              <div className="bg-white border border-blue-200 rounded-lg p-2.5 flex items-center gap-2">
                <span className="text-lg">📧</span>
                <div><div className="text-[11px] font-bold text-slate-700">Group Routing Email</div><div className="text-[10px] text-slate-400">Invoice sent to a group-specific email address</div></div>
              </div>
              <div className="bg-white border border-blue-200 rounded-lg p-2.5 flex items-center gap-2">
                <span className="text-lg">📤</span>
                <div><div className="text-[11px] font-bold text-slate-700">Upload to Group</div><div className="text-[10px] text-slate-400">Invoice uploaded at the group level in Ottimate</div></div>
              </div>
            </div>
            <div className="text-center text-xs text-blue-400 mb-2">↓ Then Ottimate auto-routes using: ↓</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[{ icon: "📦", label: "Ship-To Address" }, { icon: "#️⃣", label: "Customer Number" }, { icon: "📮", label: "ZIP Code" }].map((ch, i) => (
                <div key={i} className="bg-white border border-blue-200 rounded-lg p-2 text-center"><div className="text-lg">{ch.icon}</div><div className="text-[9px] font-semibold text-blue-700">{ch.label}</div></div>
              ))}
            </div>
          </div>
          <div className="border-2 border-emerald-300 bg-emerald-50/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">B</div>
              <div><div className="text-[11px] font-bold text-emerald-800">Direct Upload</div><div className="text-[10px] text-emerald-500">User selects the location</div></div>
            </div>
            <div className="bg-white border border-emerald-200 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">📍</div>
              <div className="text-[11px] font-bold text-slate-700">Upload directly to a specific location</div>
              <div className="text-[10px] text-slate-400 mt-1.5">{paradigm === "standard" ? `e.g., Upload invoice straight to "${locName}" — no routing needed` : `e.g., Upload invoice straight to "${locName}" department — no routing needed`}</div>
            </div>
            <div className="mt-3 bg-emerald-100 border border-emerald-200 rounded-lg p-2.5 text-center"><div className="text-[10px] text-emerald-700">Invoice is immediately associated with the selected location. No ambiguity.</div></div>
          </div>
        </div>
        {hasTbs && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <span className="font-bold">Fallback (Group Routing only):</span> If ship-to, customer number, and ZIP don't produce a match, the invoice lands in the <span className="font-semibold">"To Be Sorted"</span> bucket. An end user must manually sort it into the correct group and location.
          </div>
        )}
        {hasSplitting && (
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-xs text-violet-800">
            <span className="font-bold">Splitting Location:</span> For intercompany transactions or invoices that span multiple locations, the Splitting location allows mapping a single invoice across multiple GL entities.
          </div>
        )}
      </div>
    ),
    // Step 1: Association
    () => (
      <div className="space-y-4">
        <div className="text-sm font-semibold text-slate-800">Invoice is now linked to a specific location:</div>
        <div className="flex items-center justify-center gap-3">
          <div className="bg-slate-100 border-2 border-slate-300 rounded-lg p-4 text-center"><div className="text-2xl mb-1">🧾</div><div className="text-[11px] font-semibold text-slate-600">Incoming Invoice</div></div>
          <div className="text-2xl text-blue-400 animate-pulse">→</div>
          <div className={`border-2 rounded-lg p-4 text-center ${paradigm === "standard" ? "border-indigo-400 bg-indigo-50" : "border-orange-400 bg-orange-50"}`}>
            <div className="text-2xl mb-1">📍</div><div className="text-[11px] font-bold text-slate-800">{locName}</div><div className="text-[10px] text-slate-500">within {groupName}</div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">Under a single login, users see a <span className="font-semibold">location dropdown</span>. Invoices are scoped to the location they belong to — no cross-site confusion.</div>
      </div>
    ),
    // Step 2: Segment separation
    () => (
      <div className="space-y-4">
        <div className="text-sm font-semibold text-slate-800">GL code is broken into individual segments:</div>
        <div className="flex flex-col items-center gap-3">
          <div className="bg-slate-800 text-white rounded-lg px-6 py-3 text-center font-mono">
            <div className="text-[10px] text-slate-400 mb-1">Traditional: One monolithic GL string</div>
            <div className="text-lg font-bold tracking-wider">{glExample.full}</div>
          </div>
          <div className="text-xl text-slate-400">↓ Ottimate breaks this apart ↓</div>
          <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
            <SegmentCard label="Natural GL Code" value={glExample.natural} color="emerald" desc="What was purchased" />
            <SegmentCard label="Location Segment" value={glExample.location} color="blue" desc="Which site / store" />
            <SegmentCard label="Department Segment" value={glExample.department} color="purple" desc="Which department" />
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800"><span className="font-bold">Key insight:</span> Ottimate doesn't need the full GL string up front. Each segment is managed independently, then reassembled at export.</div>
      </div>
    ),
    // Step 3: Natural GL
    () => (
      <div className="space-y-4">
        <div className="text-sm font-semibold text-slate-800">Natural GL code is the only segment that requires setup:</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-2 border-slate-200 bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-slate-600 text-white flex items-center justify-center text-xs font-bold">1</div>
              <div><div className="text-[11px] font-bold text-slate-800">Vendor-Level Defaults</div><div className="text-[10px] text-slate-500">Set once, applies everywhere</div></div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400"></div><span className="text-[11px] text-slate-700">Default GL code assigned at the vendor level</span></div>
              <div className="bg-slate-50 rounded p-2 text-center"><span className="text-[10px] text-slate-500">e.g., </span><span className="text-xs font-mono font-bold text-slate-800">Sysco → {glExample.natural}</span><span className="text-[10px] text-slate-400"> (Food Purchases)</span></div>
              <div className="text-[10px] text-slate-400">All invoices from this vendor default to this GL code unless overridden by an item-level rule.</div>
            </div>
          </div>
          <div className="border-2 border-blue-200 bg-blue-50/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</div>
              <div><div className="text-[11px] font-bold text-blue-800">Item-Level Mapping Rules</div><div className="text-[10px] text-blue-500">User-created, flexible scope</div></div>
            </div>
            <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400"></div><span className="text-[11px] text-slate-700">Users create rules to map specific items to GL codes</span></div>
              <div className="bg-blue-50 rounded p-2 text-center"><span className="text-[10px] text-blue-500">e.g., </span><span className="text-xs font-mono font-bold text-blue-800">"Chicken Breast" → {glExample.natural}</span></div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center"><div className="text-lg">🌐</div><div className="text-[10px] font-semibold text-blue-700">Shared Across All Locations</div></div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 text-center"><div className="text-lg">📍</div><div className="text-[10px] font-semibold text-indigo-700">Location-Specific</div></div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="bg-emerald-100 border-2 border-emerald-400 rounded-xl px-6 py-3 text-center">
            <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Applied</div>
            <div className="text-xl font-mono font-bold text-emerald-700">{glExample.natural}</div>
            <div className="text-[10px] text-emerald-500">Natural GL Code</div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800"><span className="font-bold">No static GL per vendor per store.</span> Vendor defaults cover the broad strokes. Item-level mapping rules — created by end users — handle the exceptions, and can be scoped globally or per-location.</div>
      </div>
    ),
    // Step 4: Auto-fix
    () => (
      <div className="space-y-4">
        <div className="text-sm font-semibold text-slate-800">Remaining segments are applied automatically:</div>
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          <div className="border-2 border-blue-400 bg-blue-50 rounded-xl p-4 text-center">
            <div className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-2">Location Segment</div>
            <div className="text-lg font-mono font-bold text-blue-700 mb-1">{glExample.location}</div>
            <div className="text-[10px] text-blue-600 bg-blue-100 rounded-full px-2 py-0.5 inline-block">{info.glSegments.location}</div>
            <div className="mt-2 text-[10px] text-blue-400">{paradigm === "standard" ? `Fixed by location: ${locName}` : `Fixed by group: ${groupName}`}</div>
          </div>
          <div className="border-2 border-purple-400 bg-purple-50 rounded-xl p-4 text-center">
            <div className="text-[10px] text-purple-500 font-bold uppercase tracking-wider mb-2">Department Segment</div>
            <div className="text-lg font-mono font-bold text-purple-700 mb-1">{glExample.department}</div>
            <div className="text-[10px] text-purple-600 bg-purple-100 rounded-full px-2 py-0.5 inline-block">{info.glSegments.department}</div>
            <div className="mt-2 text-[10px] text-purple-400">{paradigm === "standard" ? "Driven by line-item / category rules" : `Fixed by location: ${locName}`}</div>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800"><span className="font-bold">Zero manual effort.</span> Because Ottimate knows where the invoice lives, these segments are applied before anyone touches it.</div>
      </div>
    ),
    // Step 5: Routing
    () => (
      <div className="space-y-4">
        <div className="text-sm font-semibold text-slate-800">Approval routing uses both dimensions:</div>
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-center"><div className="text-[10px] text-blue-500 font-bold">{paradigm === "standard" ? "STORE" : "LOCATION"}</div><div className="text-xs font-semibold text-slate-800">{paradigm === "standard" ? locName : groupName}</div></div>
            <div className="text-lg text-slate-300">+</div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 text-center"><div className="text-[10px] text-purple-500 font-bold">DEPARTMENT</div><div className="text-xs font-semibold text-slate-800">{paradigm === "standard" ? "Category-based" : locName}</div></div>
          </div>
          <div className="text-xl text-slate-400">↓</div>
          <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl px-6 py-4 text-center"><div className="text-2xl mb-1">👤</div><div className="text-xs font-bold text-emerald-800">Correct Department Manager</div><div className="text-[10px] text-emerald-600 mt-1">at the correct store / property</div></div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800"><span className="font-bold">Example:</span> Pet food invoice at {paradigm === "standard" ? locName : groupName} → routes to the {paradigm === "standard" ? "pet department" : locName} manager at that location.</div>
      </div>
    ),
    // Step 6: Export
    () => (
      <div className="space-y-4">
        <div className="text-sm font-semibold text-slate-800">After approval, full GL string is reassembled for ERP export:</div>
        <div className="flex flex-col items-center gap-3">
          <div className="grid grid-cols-3 gap-2 max-w-lg w-full">
            <SegmentCard label="Natural GL" value={glExample.natural} color="emerald" desc="From vendor/item" />
            <SegmentCard label="Location" value={glExample.location} color="blue" desc="Auto-fixed" />
            <SegmentCard label="Department" value={glExample.department} color="purple" desc="Auto-fixed" />
          </div>
          <div className="text-xl text-slate-400">↓ Reassembled ↓</div>
          <div className="bg-slate-800 text-white rounded-xl px-8 py-4 text-center shadow-lg">
            <div className="text-[10px] text-slate-400 mb-1">Complete GL String for ERP</div>
            <div className="text-2xl font-mono font-bold tracking-wider">
              <span className="text-emerald-400">{glExample.natural}</span><span className="text-slate-500">-</span>
              <span className="text-blue-400">{glExample.location}</span><span className="text-slate-500">-</span>
              <span className="text-purple-400">{glExample.department}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Compatible with existing Catapult / ERP GL structure</div>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800"><span className="font-bold">Result:</span> No one-static-GL-per-vendor-per-store. Location and department detail preserved. Coding and routing fully automated.</div>
      </div>
    ),
  ];
  const Content = stepContent[step] || stepContent[0];
  return (
    <div className="border-2 border-slate-200 rounded-xl p-5 bg-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl">{FLOW_STEPS[step].icon}</div>
        <div><div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Step {step + 1} of {FLOW_STEPS.length}</div><div className="text-sm font-bold text-slate-800">{FLOW_STEPS[step].title}</div></div>
      </div>
      <Content />
    </div>
  );
}

function SegmentCard({ label, value, color, desc }) {
  const colors = { emerald: "border-emerald-300 bg-emerald-50 text-emerald-700", blue: "border-blue-300 bg-blue-50 text-blue-700", purple: "border-purple-300 bg-purple-50 text-purple-700" };
  return (
    <div className={`border-2 rounded-lg p-3 text-center ${colors[color]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</div>
      <div className="text-sm font-mono font-bold mt-1">{value}</div>
      {desc && <div className="text-[10px] opacity-60 mt-0.5">{desc}</div>}
    </div>
  );
}

// ─── Routing Diagram ─────────────────────────────────────────────────────────
function RoutingDiagram({ paradigm, groups, selectedGroup, selectedLoc }) {
  const group = groups[selectedGroup] || groups[0];
  if (!group) return <div className="text-xs text-slate-400">Add at least one group with locations to see routing.</div>;
  const normalLocs = group.locations.filter(l => l.type === "normal");
  const loc = normalLocs[selectedLoc]?.name || normalLocs[0]?.name || "";
  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500 mb-2">Showing routing for: <span className="font-semibold text-slate-700">{group.name}</span></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Invoice Arrives</div>
          <div className="space-y-2">
            {normalLocs.map((l, i) => (
              <div key={i} className={`text-xs p-2 rounded-lg border transition-all ${i === selectedLoc ? "border-blue-400 bg-blue-50 text-blue-800 font-semibold" : "border-slate-200 bg-white text-slate-500"}`}>🧾 Invoice → {l.name}</div>
            ))}
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-3">Ottimate Knows</div>
          <div className="space-y-3">
            <div className="bg-white border border-blue-200 rounded-lg p-3"><div className="text-[10px] text-blue-400 font-bold">{paradigm === "standard" ? "STORE / LOCATION" : "LOCATION (from Group)"}</div><div className="text-xs font-semibold text-slate-800 mt-0.5">{paradigm === "standard" ? loc : group.name}</div></div>
            <div className="text-center text-blue-300 text-lg">+</div>
            <div className="bg-white border border-blue-200 rounded-lg p-3"><div className="text-[10px] text-blue-400 font-bold">{paradigm === "standard" ? "DEPARTMENT (from line item)" : "DEPARTMENT (from Location)"}</div><div className="text-xs font-semibold text-slate-800 mt-0.5">{paradigm === "standard" ? "Per line-item category" : loc}</div></div>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-3">Routes To</div>
          <div className="space-y-2">
            {normalLocs.map((l, i) => (
              <div key={i} className={`text-xs p-2 rounded-lg border transition-all ${i === selectedLoc ? "border-emerald-400 bg-emerald-100 text-emerald-800 font-semibold" : "border-slate-200 bg-white text-slate-400"}`}>👤 {l.name} Manager</div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-slate-800 rounded-xl p-4 text-center">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Result</div>
        <div className="text-sm text-white">
          Invoice for <span className="text-blue-400 font-bold">{paradigm === "standard" ? loc : group.name}</span>
          {paradigm === "standard" ? " department " : " → "}
          <span className="text-purple-400 font-bold">{paradigm === "standard" ? "(per line item)" : loc}</span>
          {" → "}<span className="text-emerald-400 font-bold">{loc} Manager</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1">Automatic. No manual assignment needed.</div>
      </div>
    </div>
  );
}
