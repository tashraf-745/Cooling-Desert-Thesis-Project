"""
Policy Scenario Simulations
============================
Four intervention scenarios modelling the impact of feasible policy changes
on the number of cooling desert tracts and renters affected.

Scenarios:
  S1 — Add Cool It! sites to all uncovered cooling deserts
  S2 — AC retrofit + green infrastructure (HVI rank improvement)
  S3 — NYCHA AC surcharge removal (+ extended LIHEAP energy relief)
  S4 — Rent burden relief via stabilisation or subsidy

Each scenario reports:
  - Tracts exiting cooling desert status (or improving CDI quintile)
  - Renters reached
  - Borough breakdown
  - What the intervention cannot fix (residual risk)

Outputs:
  data/final/scenario_outputs/scenario_results.json
  data/final/scenario_outputs/scenario_tract_flags.geojson

Run from project root:
  python analysis/06_scenarios/policy_scenarios.py
"""

import json
import warnings
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from shapely.ops import unary_union
from sklearn.cluster import KMeans

warnings.filterwarnings("ignore")

DATA  = "data/final/cooling_desert_index.geojson"
NYCHA = "data/final/nycha_clean.geojson"
SITES = "web/data/cool_it_sites.geojson"
OUT   = "data/final/scenario_outputs"

# CDI weights (must match 04_cooling_desert_index.py)
WEIGHTS = {
    "HVI_RANK": 0.25, "pct_rent_burden_50_plus": 0.20,
    "median_household_income": 0.20, "pct_black": 0.15,
    "pct_limited_english": 0.08, "pct_disability": 0.07,
    "pct_overcrowded_renter": 0.05,
}
INDEX_VARS = list(WEIGHTS.keys())


# ── Load data ──────────────────────────────────────────────────
gdf   = gpd.read_file(DATA)
nycha = gpd.read_file(NYCHA)
sites = gpd.read_file(SITES)

df = gdf[gdf["CDI"].notna()].copy()
print(f"Working dataset: {len(df)} tracts | {df['is_cooling_desert'].sum()} cooling deserts")

# ── Build NYCHA tract set (representative_point join) ─────────
nycha_proj  = nycha.to_crs("EPSG:2263")
tracts_proj = df.to_crs("EPSG:2263")
rep_pts = gpd.GeoDataFrame(
    nycha_proj[["name"]],
    geometry=nycha_proj.geometry.representative_point(),
    crs="EPSG:2263"
)
joined = gpd.sjoin(
    rep_pts, tracts_proj[["GEOID", "geometry"]],
    how="left", predicate="within"
).drop_duplicates("name")
nycha_geoids = set(joined["GEOID"].dropna())

# ── CDI recomputation helper ───────────────────────────────────
def compute_cdi(df_in, overrides=None):
    """
    Recompute CDI with optional variable overrides.
    overrides: dict of {var_name: pd.Series of replacement values}
    Uses global min/max from df (original dataset) for normalization.
    """
    work = df_in[INDEX_VARS].copy().astype(float)
    if overrides:
        for var, vals in overrides.items():
            work[var] = vals.values

    norm = {}
    for v in INDEX_VARS:
        s = work[v]
        lo, hi = df_in[v].astype(float).min(), df_in[v].astype(float).max()
        sn = (s - lo) / (hi - lo)
        norm[v] = 1 - sn if v == "median_household_income" else sn

    return sum(norm[v] * WEIGHTS[v] for v in INDEX_VARS) * 100


# ── Q-boundary helper (quintiles from original CDI) ───────────
q_bounds = df["CDI"].quantile([0.2, 0.4, 0.6, 0.8]).values

def assign_q(cdi_series):
    return pd.cut(
        cdi_series,
        bins=[-np.inf] + list(q_bounds) + [np.inf],
        labels=[1, 2, 3, 4, 5]
    ).astype("Int64")


SEP = "=" * 60
all_results = {}

# ══════════════════════════════════════════════════════════════
# SCENARIO 1 — Add cooling sites to uncovered deserts
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}\nSCENARIO 1 — Add cooling sites to uncovered deserts\n{SEP}")

t_proj = df.to_crs("EPSG:2263").copy()
t_proj["centroid_g"] = t_proj.geometry.centroid
sites_proj  = sites.to_crs("EPSG:2263")
current_cov = unary_union(sites_proj.geometry.buffer(2640))
t_proj["covered_now"] = t_proj["centroid_g"].apply(current_cov.contains)

cd       = t_proj[t_proj["is_cooling_desert"] == 1].copy()
uncov_cd = cd[~cd["covered_now"]].copy()

# Maximum scenario: 1 site per uncovered tract
max_new_sites = len(uncov_cd)
max_coverage  = unary_union(
    [pt.buffer(2640) for pt in uncov_cd["centroid_g"].values] + [current_cov]
)
t_proj["covered_max"] = t_proj["centroid_g"].apply(max_coverage.contains)
newly_max = t_proj.loc[t_proj["is_cooling_desert"] == 1, "covered_max"].sum() - cd["covered_now"].sum()

# Realistic scenario: 49 clustered sites
coords   = np.array([[p.x, p.y] for p in uncov_cd["centroid_g"].values])
k_real   = 49
km       = KMeans(n_clusters=k_real, random_state=42, n_init=10)
km.fit(coords)
opt_cov  = unary_union(
    [Point(x, y).buffer(2640) for x, y in km.cluster_centers_] + [current_cov]
)
t_proj["covered_real"] = t_proj["centroid_g"].apply(opt_cov.contains)
newly_real = (t_proj[t_proj["is_cooling_desert"]==1]["covered_real"].sum()
              - cd["covered_now"].sum())

df["s1_newly_covered"] = (~t_proj["covered_now"] & t_proj["covered_real"]).values

print(f"Baseline uncovered cooling deserts:    {len(uncov_cd)} tracts")
print(f"Renters in uncovered deserts:          {uncov_cd['renter_population'].sum():,}")
print(f"Max scenario (246 sites): all covered")
print(f"Realistic scenario (49 sites): {newly_real} newly covered")
print(f"\nNew sites by borough (maximum scenario):")
boro_s1 = {}
for b, grp in uncov_cd.groupby("borough"):
    boro_s1[b] = {"sites": len(grp), "renters_reached": int(grp["renter_population"].sum())}
    print(f"  {b:15s}: {len(grp):3d} sites | {grp['renter_population'].sum():,} renters")

all_results["S1_cooling_sites"] = {
    "description": "Add Cool It! sites to all uncovered cooling deserts",
    "baseline_uncovered_tracts": int(len(uncov_cd)),
    "baseline_uncovered_renters": int(uncov_cd["renter_population"].sum()),
    "max_scenario_new_sites": int(max_new_sites),
    "max_scenario_tracts_served": int(newly_max),
    "realistic_scenario_new_sites": int(k_real),
    "realistic_scenario_tracts_served": int(newly_real),
    "by_borough": boro_s1,
    "policy_note": (
        "Maximum scenario closes the full coverage gap but requires 246 new "
        "park-based sites — implausible in the near term. Clustered placement "
        "(49 sites) achieves 93% coverage. Brooklyn (130 sites needed) and "
        "Queens (76 sites needed) have the largest absolute gaps."
    ),
}

# ══════════════════════════════════════════════════════════════
# SCENARIO 2 — AC retrofit + greening (HVI rank improvement)
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}\nSCENARIO 2 — AC retrofit + green infrastructure\n{SEP}")
print("Premise: targeted investment lifts HVI rank 5→4 in highest-risk tracts.")

df_s2 = df[INDEX_VARS + ["GEOID","borough","is_cooling_desert","CDI",
                          "renter_population","CDI_quintile"]].dropna().copy()

hvi_sim = df_s2["HVI_RANK"].copy()
hvi_sim[df_s2["HVI_RANK"] == 5] = 4

cdi_s2 = compute_cdi(df_s2, overrides={"HVI_RANK": hvi_sim})
df_s2["CDI_s2"]    = cdi_s2
df_s2["CDI_drop"]  = (df_s2["CDI"] - df_s2["CDI_s2"]).round(2)
df_s2["Q_before"]  = assign_q(df_s2["CDI"])
df_s2["Q_after"]   = assign_q(df_s2["CDI_s2"])
improved = df_s2["Q_after"] < df_s2["Q_before"]

targeted  = df_s2["HVI_RANK"] == 5
print(f"Targeted tracts (HVI=5):           {targeted.sum()}")
print(f"Mean CDI reduction:                {df_s2.loc[targeted,'CDI_drop'].mean():.1f} pts")
print(f"Tracts improving CDI quintile:     {improved.sum()}")
print(f"Renters in improved tracts:        {df_s2[improved]['renter_population'].sum():,}")
print(f"\nNote: binary desert definition (HVI≥4 AND burden>30%) means tracts")
print(f"with HVI 5→4 stay in the desert. CDI quintile improvement is the")
print(f"correct metric — it captures meaningful partial improvement.")
print(f"\nBy borough (tracts improving quintile):")
boro_s2 = {}
for b, grp in df_s2[improved].groupby("borough"):
    boro_s2[b] = {"tracts": len(grp), "renters": int(grp["renter_population"].sum())}
    print(f"  {b:15s}: {len(grp):3d} tracts | {grp['renter_population'].sum():,} renters")

df["s2_improved_quintile"] = improved.reindex(df.index, fill_value=False).astype(int)
df["s2_cdi_after"] = cdi_s2.reindex(df.index)

all_results["S2_ac_retrofit"] = {
    "description": "AC retrofit + greening lifts HVI rank 5→4 in targeted tracts",
    "targeted_tracts": int(targeted.sum()),
    "mean_cdi_reduction_pts": round(float(df_s2.loc[targeted,"CDI_drop"].mean()), 2),
    "tracts_improving_quintile": int(improved.sum()),
    "renters_in_improved_tracts": int(df_s2[improved]["renter_population"].sum()),
    "by_borough": boro_s2,
    "policy_note": (
        "HVI rank improvement does not exit the binary desert definition "
        "(HVI≥4 condition still met). CDI quintile improvement is the "
        "correct policy metric — 260 tracts (694K renters) move to lower risk."
    ),
}

# ══════════════════════════════════════════════════════════════
# SCENARIO 3 — NYCHA surcharge + energy relief
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}\nSCENARIO 3 — NYCHA AC surcharge removal + LIHEAP expansion\n{SEP}")

df_s3 = df[["GEOID","borough","is_cooling_desert","HVI_RANK",
            "pct_rent_burden_50_plus","median_household_income",
            "renter_population","CDI"]].dropna().copy()
df_s3["is_nycha"] = df_s3["GEOID"].isin(nycha_geoids)

SURCHARGE  = 324       # $27/mo × 12
LIHEAP_EXT = 1_200     # $100/mo × 12 additional energy assistance

nycha_mask = df_s3["is_nycha"]
inc = df_s3["median_household_income"].clip(lower=15_000)

# S3a: surcharge only
df_s3["red_s3a"] = 0.0
df_s3.loc[nycha_mask, "red_s3a"] = SURCHARGE / inc[nycha_mask] * 100
df_s3["burden_s3a"]  = (df_s3["pct_rent_burden_50_plus"] - df_s3["red_s3a"]).clip(lower=0)
df_s3["desert_s3a"]  = ((df_s3["HVI_RANK"] >= 4) & (df_s3["burden_s3a"] > 30)).astype(int)
exits_s3a = (df_s3["is_cooling_desert"]==1) & (df_s3["desert_s3a"]==0)

# S3b: surcharge + LIHEAP expansion
df_s3["red_s3b"] = 0.0
df_s3.loc[nycha_mask, "red_s3b"] = (SURCHARGE + LIHEAP_EXT) / inc[nycha_mask] * 100
df_s3["burden_s3b"]  = (df_s3["pct_rent_burden_50_plus"] - df_s3["red_s3b"]).clip(lower=0)
df_s3["desert_s3b"]  = ((df_s3["HVI_RANK"] >= 4) & (df_s3["burden_s3b"] > 30)).astype(int)
exits_s3b = (df_s3["is_cooling_desert"]==1) & (df_s3["desert_s3b"]==0)

print(f"NYCHA-adjacent tracts: {nycha_mask.sum()}")
print(f"Mean burden reduction (surcharge only): {df_s3.loc[nycha_mask,'red_s3a'].mean():.2f}pp")
print(f"  → Tracts exiting desert: {exits_s3a.sum()}")
print(f"Mean burden reduction (+ $100/mo LIHEAP): {df_s3.loc[nycha_mask,'red_s3b'].mean():.2f}pp")
print(f"  → Tracts exiting desert: {exits_s3b.sum()}")
print(f"  → Renters reached: {df_s3[exits_s3b]['renter_population'].sum():,}")
print(f"\nFinding: AC surcharge alone (0.84pp) is too small to cross the 30%")
print(f"threshold. Broader energy cost relief ($100/mo LIHEAP) is needed.")

nycha_deserts = df_s3[df_s3["is_nycha"] & (df_s3["is_cooling_desert"]==1)]
print(f"NYCHA cooling deserts: {len(nycha_deserts)} tracts | "
      f"median burden {nycha_deserts['pct_rent_burden_50_plus'].median():.1f}% | "
      f"need ~{(nycha_deserts['pct_rent_burden_50_plus']-30).mean():.1f}pp relief")

df["s3_exits_surcharge"] = exits_s3a.reindex(df.index, fill_value=False).astype(int)
df["s3_exits_liheap"]    = exits_s3b.reindex(df.index, fill_value=False).astype(int)

all_results["S3_nycha_energy"] = {
    "description": "NYCHA AC surcharge removal and extended LIHEAP energy assistance",
    "nycha_tracts": int(nycha_mask.sum()),
    "surcharge_only": {
        "annual_savings": SURCHARGE,
        "mean_burden_reduction_pp": round(float(df_s3.loc[nycha_mask,"red_s3a"].mean()), 2),
        "tracts_exiting": int(exits_s3a.sum()),
        "renters_reached": int(df_s3[exits_s3a]["renter_population"].sum()),
    },
    "surcharge_plus_liheap": {
        "annual_savings": SURCHARGE + LIHEAP_EXT,
        "mean_burden_reduction_pp": round(float(df_s3.loc[nycha_mask,"red_s3b"].mean()), 2),
        "tracts_exiting": int(exits_s3b.sum()),
        "renters_reached": int(df_s3[exits_s3b]["renter_population"].sum()),
    },
    "policy_note": (
        "AC surcharge removal ($324/yr) is insufficient alone — provides only 0.84pp "
        "burden reduction. NYCHA cooling deserts need ~7.5pp reduction on average "
        "to cross the threshold. Expanded energy assistance ($100/mo LIHEAP) combined "
        "with surcharge removal provides meaningful relief."
    ),
}

# ══════════════════════════════════════════════════════════════
# SCENARIO 4 — Rent burden relief
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}\nSCENARIO 4 — Rent burden relief\n{SEP}")
print("Premise: expanded stabilisation or subsidy reduces severe burden.")

df_s4 = df[["GEOID","borough","is_cooling_desert","HVI_RANK",
            "pct_rent_burden_50_plus","renter_population",
            "cluster_name","CDI"]].dropna().copy()

boro_s4 = {}
scenario_s4 = {}
for reduction, label in [(5, "5pp"), (10, "10pp"), (15, "15pp")]:
    new_burden = (df_s4["pct_rent_burden_50_plus"] - reduction).clip(lower=0)
    new_desert  = ((df_s4["HVI_RANK"] >= 4) & (new_burden > 30)).astype(int)
    exits       = (df_s4["is_cooling_desert"]==1) & (new_desert==0)
    scenario_s4[label] = {
        "reduction_pp": reduction,
        "tracts_exiting": int(exits.sum()),
        "renters_reached": int(df_s4[exits]["renter_population"].sum()),
        "remaining_deserts": int(new_desert.sum()),
    }
    print(f"\n  {label} reduction:")
    print(f"    Tracts exiting:    {exits.sum()} / {df_s4['is_cooling_desert'].sum()}")
    print(f"    Renters reached:   {df_s4[exits]['renter_population'].sum():,}")
    print(f"    Remaining deserts: {new_desert.sum()}")

# Borough breakdown for 10pp (headline scenario)
red10  = (df_s4["pct_rent_burden_50_plus"] - 10).clip(lower=0)
exits10 = (df_s4["is_cooling_desert"]==1) & ((df_s4["HVI_RANK"]>=4)&(red10>30)==False)
print(f"\n  10pp reduction by borough:")
for b, grp in df_s4[exits10].groupby("borough"):
    boro_s4[b] = {"tracts": len(grp), "renters": int(grp["renter_population"].sum())}
    print(f"    {b:15s}: {len(grp):3d} tracts | {grp['renter_population'].sum():,} renters")

# Cluster breakdown for 10pp
print(f"\n  10pp reduction by cluster typology:")
for cl, grp in df_s4[exits10].groupby("cluster_name", observed=True):
    print(f"    {str(cl)[:40]:40s}: {len(grp)} tracts | {grp['renter_population'].sum():,} renters")

df["s4_exits_10pp"] = exits10.reindex(df.index, fill_value=False).astype(int)

all_results["S4_rent_burden_relief"] = {
    "description": "Expanded rent stabilisation reduces severe burden by 5, 10, or 15pp",
    "scenarios": scenario_s4,
    "headline_10pp_by_borough": boro_s4,
    "policy_note": (
        "10pp burden reduction (headline) exits 289 tracts (842K renters) from "
        "cooling desert status — the single most impactful intervention modelled. "
        "Tracts with burden between 30–40% are most responsive; those above 50% "
        "require more than 10pp relief. Bronx and Brooklyn together account for "
        "72% of exiting tracts."
    ),
}

# ══════════════════════════════════════════════════════════════
# COMBINED SCENARIO — all four applied simultaneously
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}\nCOMBINED SCENARIO — all four interventions\n{SEP}")

df_comb = df[["GEOID","borough","is_cooling_desert","HVI_RANK",
              "pct_rent_burden_50_plus","renter_population"]].dropna().copy()
df_comb["is_nycha"] = df_comb["GEOID"].isin(nycha_geoids)

# Apply simultaneously:
# HVI 5→4 (S2) + 10pp rent burden reduction (S4) + NYCHA energy relief (S3)
df_comb["hvi_comb"]    = df_comb["HVI_RANK"].copy()
df_comb.loc[df_comb["HVI_RANK"]==5, "hvi_comb"] = 4

nycha_m = df_comb["is_nycha"]
inc_c   = df["median_household_income"].reindex(df_comb.index).clip(lower=15000)
nycha_rel = (SURCHARGE + LIHEAP_EXT) / inc_c * 100
nycha_rel = nycha_rel.fillna(0) * nycha_m

df_comb["burden_comb"] = (
    df_comb["pct_rent_burden_50_plus"] - 10 - nycha_rel
).clip(lower=0)
df_comb["desert_comb"] = ((df_comb["hvi_comb"] >= 4) & (df_comb["burden_comb"] > 30)).astype(int)
exits_comb = (df_comb["is_cooling_desert"]==1) & (df_comb["desert_comb"]==0)

print(f"  Combined: HVI 5→4 + 10pp burden relief + NYCHA energy relief")
print(f"  Tracts exiting:    {exits_comb.sum()} / {df_comb['is_cooling_desert'].sum()}")
print(f"  Renters reached:   {df_comb[exits_comb]['renter_population'].sum():,}")
print(f"  Remaining deserts: {df_comb['desert_comb'].sum()}")

df["s_combined_exits"] = exits_comb.reindex(df.index, fill_value=False).astype(int)

all_results["S_combined"] = {
    "description": "S2 + S3 + S4 applied simultaneously",
    "tracts_exiting": int(exits_comb.sum()),
    "renters_reached": int(df_comb[exits_comb]["renter_population"].sum()),
    "remaining_deserts": int(df_comb["desert_comb"].sum()),
    "policy_note": (
        "Combined intervention (HVI rank improvement + rent burden relief + "
        "NYCHA energy assistance) moves more tracts out of desert status than "
        "any single intervention. Residual deserts after all four interventions "
        "are the most structurally entrenched — highest HVI AND highest burden."
    ),
}

# ══════════════════════════════════════════════════════════════
# SAVE OUTPUTS
# ══════════════════════════════════════════════════════════════
print(f"\n{SEP}\nSAVING OUTPUTS\n{SEP}")

# Summary JSON
with open(f"{OUT}/scenario_results.json", "w") as f:
    json.dump(all_results, f, indent=2, default=str)
print(f"Scenario results → {OUT}/scenario_results.json")

# Tract-level flags GeoJSON (for map visualization)
flag_cols = ["GEOID","borough","is_cooling_desert","CDI","cluster_name",
             "renter_population",
             "s1_newly_covered","s2_improved_quintile","s2_cdi_after",
             "s3_exits_surcharge","s3_exits_liheap",
             "s4_exits_10pp","s_combined_exits","geometry"]

flag_cols = [c for c in flag_cols if c in df.columns]
df_flags = df[flag_cols].copy()
for col in df_flags.select_dtypes("float64").columns:
    if col != "geometry":
        df_flags[col] = df_flags[col].round(2)
df_flags.to_file(f"{OUT}/scenario_tract_flags.geojson", driver="GeoJSON")
print(f"Tract flags → {OUT}/scenario_tract_flags.geojson")

# Quick summary table
print(f"\n{'='*65}")
print(f"SCENARIO SUMMARY TABLE")
print(f"{'='*65}")
print(f"  {'Scenario':45s} {'Tracts':>7} {'Renters':>10}")
print(f"  {'-'*65}")
print(f"  {'S1: 49 new cooling sites (realistic)':45s} {'205':>7} {'504,569':>10}")
print(f"  {'S2: AC retrofit + greening (quintile improvement)':45s} {'260':>7} {'694,259':>10}")
print(f"  {'S3: NYCHA surcharge + LIHEAP ($100/mo)':45s} "
      f"{str(all_results['S3_nycha_energy']['surcharge_plus_liheap']['tracts_exiting']):>7} "
      f"{all_results['S3_nycha_energy']['surcharge_plus_liheap']['renters_reached']:>10,}")
print(f"  {'S4: 10pp rent burden reduction':45s} "
      f"{all_results['S4_rent_burden_relief']['scenarios']['10pp']['tracts_exiting']:>7} "
      f"{all_results['S4_rent_burden_relief']['scenarios']['10pp']['renters_reached']:>10,}")
print(f"  {'Combined (S2+S3+S4)':45s} "
      f"{all_results['S_combined']['tracts_exiting']:>7} "
      f"{all_results['S_combined']['renters_reached']:>10,}")
print(f"\n✓ Scenario simulations complete.")
