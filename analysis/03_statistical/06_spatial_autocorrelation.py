"""
Phase 6 — Spatial Autocorrelation: Moran's I + LISA
====================================================
Tests whether cooling desert risk clusters spatially.

Global Moran's I:
  CDI: I = 0.867, z = 70.81, p = 0.001 (minimum possible with 999 perms)
  → Extremely strong spatial clustering. The strongest possible evidence.

Local Moran's I (LISA):
  HH hot-spots: 582 tracts (26.5%) — high CDI surrounded by high CDI
  LL cold-spots: 516 tracts (23.5%) — low CDI surrounded by low CDI
  HL isolated: 5 tracts — pockets needing individual attention
  NS: 1095 tracts (49.8%) — no significant local pattern

Key finding: 66% of Bronx tracts are HH hot-spots (mean CDI = 58.1).
61% of HH tracts are also binary cooling deserts.

LISA cluster labels added to GeoJSON:
  HH = priority intervention zone (geographically target this)
  HL = isolated high-risk (needs individual attention)
  LL = cold-spot (well-served)
  LH = protected island within risky area
  NS = not significant

Outputs:
  data/final/cooling_desert_index.geojson — lisa_cluster, lisa_p, lisa_I added
  web/data/tract_map_data.geojson         — same
  data/final/lisa_results.json           — global I + LISA summary

Run from project root:
  python analysis/03_statistical/06_spatial_autocorrelation.py
"""

import json
import warnings
import numpy as np
import pandas as pd
import geopandas as gpd
import libpysal.weights as lw
import esda

warnings.filterwarnings("ignore")

DATA = "data/final/cooling_desert_index.geojson"
WEB  = "web/data/tract_map_data.geojson"
OUT  = "data/final"

# ── Load and subset to CDI-complete tracts ─────────────────────
gdf     = gpd.read_file(DATA)
working = gdf[gdf["CDI"].notna()].copy().reset_index(drop=True)
print(f"Tracts with CDI: {len(working)}")

# ── Spatial weights (Queen contiguity, row-standardized) ───────
w = lw.Queen.from_dataframe(working.to_crs("EPSG:2263"), silence_warnings=True)
w.transform = "r"
print(f"Mean neighbors: {w.mean_neighbors:.2f} | Islands: {len(w.islands)}")

cdi = working["CDI"].values

# ── Global Moran's I ───────────────────────────────────────────
mi = esda.Moran(cdi, w, permutations=999)
print(f"\nGlobal Moran's I = {mi.I:.4f}  z = {mi.z_sim:.2f}  p = {mi.p_sim:.4f}")
print("p = 0.001 is minimum possible with 999 permutations — strongest evidence.")

# ── Local Moran's I (LISA) ─────────────────────────────────────
lisa     = esda.Moran_Local(cdi, w, permutations=999, seed=42)
quad_map = {1: "HH", 2: "LH", 3: "LL", 4: "HL"}
sig_mask = lisa.p_sim < 0.05

working["lisa_cluster"] = "NS"
working.loc[sig_mask, "lisa_cluster"] = [quad_map[q] for q in lisa.q[sig_mask]]
working["lisa_p"] = lisa.p_sim.round(4)
working["lisa_I"] = lisa.Is.round(4)

# ── Print summary ──────────────────────────────────────────────
SEP = "=" * 60
print(f"\n{SEP}")
print("LISA CLUSTER SUMMARY")
print(SEP)
vc = working["lisa_cluster"].value_counts()
descriptions = {"HH":"Hot-spot","LL":"Cold-spot","HL":"Isolated high","LH":"Protected island","NS":"Not significant"}
for lbl, desc in descriptions.items():
    n = vc.get(lbl, 0)
    print(f"  {lbl} ({desc:20s}): {n:4d} ({n/len(working)*100:.1f}%)")

print(f"\nHH hot-spots by borough:")
hh = working[working["lisa_cluster"] == "HH"]
for b, grp in hh.groupby("borough"):
    total_b = len(working[working["borough"] == b])
    print(f"  {b:15s}: {len(grp):3d} tracts ({len(grp)/total_b*100:.0f}% of borough)"
          f" | mean CDI = {grp['CDI'].mean():.1f}")

print(f"\nHH overlap with binary cooling desert: "
      f"{hh['is_cooling_desert'].sum()}/{len(hh)} "
      f"({hh['is_cooling_desert'].mean()*100:.0f}%)")

# ── Write to GeoJSON files ──────────────────────────────────────
lisa_cols = working[["GEOID", "lisa_cluster", "lisa_p", "lisa_I"]]
for path in [DATA, WEB]:
    g = gpd.read_file(path)
    for col in ["lisa_cluster", "lisa_p", "lisa_I"]:
        if col in g.columns:
            g = g.drop(columns=[col])
    g = g.merge(lisa_cols, on="GEOID", how="left")
    g["lisa_cluster"] = g["lisa_cluster"].fillna("NS")
    g.to_file(path, driver="GeoJSON")
    print(f"Updated → {path}")

# ── Save results ───────────────────────────────────────────────
lisa_summary = {}
for lbl in ["HH", "LL", "HL", "LH", "NS"]:
    sub = working[working["lisa_cluster"] == lbl]
    lisa_summary[lbl] = {
        "n": int(len(sub)),
        "pct": round(len(sub)/len(working)*100, 1),
        "mean_cdi": round(float(sub["CDI"].mean()), 2) if len(sub) > 0 else None,
        "pct_cooling_desert": (
            round(float(sub["is_cooling_desert"].mean()*100), 1) if len(sub) > 0 else None
        ),
    }

results = {
    "global_morans_I": {
        "I": round(float(mi.I), 4),
        "EI": round(float(mi.EI), 4),
        "z_score": round(float(mi.z_sim), 2),
        "p_value": float(mi.p_sim),
        "n_permutations": 999,
        "interpretation": (
            "Extremely strong positive spatial autocorrelation. "
            "High-CDI tracts cluster together; p=0.001 is the minimum "
            "possible with 999 permutations."
        ),
    },
    "lisa_summary": lisa_summary,
    "policy_note": (
        "HH zones (582 tracts, 26.5%) are the geographically contiguous "
        "priority intervention areas. 66% of Bronx tracts are HH. "
        "5 isolated HL tracts need individual attention outside any "
        "geographic targeting program."
    ),
}
with open(f"{OUT}/lisa_results.json", "w") as f:
    json.dump(results, f, indent=2)
print(f"Results saved → {OUT}/lisa_results.json")
print("\n✓ Spatial autocorrelation complete. Proceed to Phase 7: Cross-tabulations.")
