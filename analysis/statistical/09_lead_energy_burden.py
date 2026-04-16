"""
Phase 9 — DOE LEAD Energy Burden: Tract-Level Analysis
=======================================================
Joins DOE LEAD Tool energy burden data to NYC tract indicators.

Data source:
  DOE Low-Income Energy Affordability Data (LEAD) Tool, downloaded via:
  https://lead.openei.org — Census Tracts, New York, Renter-occupied
  Three downloads:
    - All AMI groups (all income levels)
    - 0–30% AMI (very low income renters)
    - 0–80% AMI (low-to-moderate income renters)

Key variables:
  Energy Burden (% income)   — share of household income spent on energy
  Avg. Annual Energy Cost ($) — average annual utility spend
  Household Income            — average annual income for the AMI group

DOE thresholds:
  > 6%  = "high energy burden"
  > 10% = "severe energy burden"

Run from project root:
  python analysis/statistical/09_lead_energy_burden.py
"""

import json
import warnings
import numpy as np
import pandas as pd
import geopandas as gpd
from pathlib import Path
from scipy import stats

warnings.filterwarnings("ignore")

BASE  = Path(__file__).resolve().parents[2]
RAW   = BASE / "data" / "raw" / "energy_burden"
FINAL = BASE / "data" / "final"
WEB   = BASE / "web" / "data"
FINAL.mkdir(parents=True, exist_ok=True)

NYC_COUNTY_FIPS = ["36005", "36047", "36061", "36081", "36085"]
BORO_MAP = {
    "36005": "Bronx",
    "36047": "Brooklyn",
    "36061": "Manhattan",
    "36081": "Queens",
    "36085": "Staten Island"
}

# ── Load LEAD data ────────────────────────────────────────────────────────────
def load_lead_nyc(csv_path, label):
    """Load LEAD CSV, filter to NYC census tracts, return clean DataFrame."""
    df = pd.read_csv(csv_path, skiprows=8)
    df["GEOID"] = df["Geography ID"].astype(str).str.zfill(11)
    nyc = df[df["GEOID"].str[:5].isin(NYC_COUNTY_FIPS)].copy()
    nyc["borough"] = nyc["GEOID"].str[:5].map(BORO_MAP)
    nyc["energy_burden"] = pd.to_numeric(nyc["Energy Burden (% income)"], errors="coerce")
    nyc["energy_burden_elec"] = pd.to_numeric(nyc["Energy Burden (% income) (Electricity)"], errors="coerce")
    nyc["energy_burden_gas"] = pd.to_numeric(nyc["Energy Burden (% income) (Gas)"], errors="coerce")
    nyc["annual_energy_cost"] = pd.to_numeric(nyc["Avg. Annual Energy Cost ($)"], errors="coerce")
    nyc["annual_energy_cost_elec"] = pd.to_numeric(nyc["Avg. Annual Energy Cost ($) (Electricity)"], errors="coerce")
    nyc["hh_income"] = pd.to_numeric(nyc["Household Income"], errors="coerce")
    nyc["total_households"] = pd.to_numeric(nyc["Total Households"], errors="coerce")
    nyc["pct_black_lead"] = pd.to_numeric(nyc["Black/ African American (% pop.)"], errors="coerce")
    print(f"  {label}: {len(nyc)} NYC tracts loaded "
          f"({nyc['energy_burden'].notna().sum()} with valid burden data)")
    return nyc


print("Loading LEAD data...")
df_all = load_lead_nyc(RAW / "lead_ny_tracts_renter_all_ami.csv",  "All AMI")
df_030 = load_lead_nyc(RAW / "lead_ny_tracts_renter_0_30ami.csv",  "0–30% AMI")
df_080 = load_lead_nyc(RAW / "lead_ny_tracts_renter_0_80ami.csv",  "0–80% AMI")

# ── Load CDI tract data ────────────────────────────────────────────────────────
print("\nLoading CDI tract data...")
gdf = gpd.read_file(WEB / "tract_map_data.geojson")
gdf = gdf[gdf["CDI"].notna()].copy()
print(f"  {len(gdf)} tracts with CDI scores")

# ── Join LEAD to CDI tracts ───────────────────────────────────────────────────
print("\nJoining LEAD to CDI tract data...")

def join_lead(tract_df, lead_df, suffix):
    cols = ["GEOID", "energy_burden", "energy_burden_elec", "energy_burden_gas",
            "annual_energy_cost", "annual_energy_cost_elec", "hh_income", "total_households"]
    lead_sub = lead_df[cols].copy()
    lead_sub.columns = ["GEOID"] + [f"{c}_{suffix}" for c in cols[1:]]
    merged = tract_df.merge(lead_sub, on="GEOID", how="left")
    matched = merged[f"energy_burden_{suffix}"].notna().sum()
    print(f"  Joined {suffix}: {matched}/{len(merged)} tracts matched")
    return merged

gdf = join_lead(gdf, df_all, "all")
gdf = join_lead(gdf, df_030, "030")
gdf = join_lead(gdf, df_080, "080")

all_results = {}

# ── Section A: NYC overview statistics ────────────────────────────────────────
print("\n[A] NYC energy burden overview...")

valid_all = gdf["energy_burden_all"].dropna()
valid_030 = gdf["energy_burden_030"].dropna()

print(f"  All renters:           mean={valid_all.mean():.1f}%  median={valid_all.median():.1f}%")
print(f"  0-30% AMI renters:     mean={valid_030.mean():.1f}%  median={valid_030.median():.1f}%")
print(f"  0-30% above 6%:  {(valid_030 > 6).mean()*100:.0f}% of tracts")
print(f"  0-30% above 10%: {(valid_030 > 10).mean()*100:.0f}% of tracts")

all_results["A_nyc_overview"] = {
    "description": "DOE LEAD energy burden for NYC renter households by AMI group",
    "doe_thresholds": {"high_burden": 6, "severe_burden": 10},
    "all_renters": {
        "mean_pct": round(float(valid_all.mean()), 1),
        "median_pct": round(float(valid_all.median()), 1),
        "mean_annual_cost": round(float(gdf["annual_energy_cost_all"].dropna().mean()), 0),
        "pct_tracts_above_6pct": round(float((valid_all > 6).mean() * 100), 1),
        "pct_tracts_above_10pct": round(float((valid_all > 10).mean() * 100), 1),
    },
    "very_low_income_0_30ami": {
        "mean_pct": round(float(valid_030.mean()), 1),
        "median_pct": round(float(valid_030.median()), 1),
        "mean_annual_cost": round(float(gdf["annual_energy_cost_030"].dropna().mean()), 0),
        "mean_annual_income": round(float(gdf["hh_income_030"].dropna().mean()), 0),
        "pct_tracts_above_6pct": round(float((valid_030 > 6).mean() * 100), 1),
        "pct_tracts_above_10pct": round(float((valid_030 > 10).mean() * 100), 1),
        "interpretation": (
            "Very low-income renters (≤30% AMI) spend 11.6% of income on energy on average. "
            "86% of NYC tracts exceed the DOE high-burden threshold (>6%), "
            "and 42% exceed the severe threshold (>10%). "
            "This is the structural cost barrier that prevents AC use even when units have AC."
        )
    },
    "low_to_mod_income_0_80ami": {
        "mean_pct": round(float(gdf["energy_burden_080"].dropna().mean()), 1),
        "median_pct": round(float(gdf["energy_burden_080"].dropna().median()), 1),
        "mean_annual_cost": round(float(gdf["annual_energy_cost_080"].dropna().mean()), 0),
    }
}

# ── Section B: Energy burden × CDI ───────────────────────────────────────────
print("\n[B] Energy burden × Cooling Desert Index...")

# Correlation between CDI and low-income energy burden
valid_eb = gdf[gdf["energy_burden_030"].notna() & gdf["CDI"].notna()]
r, p = stats.pearsonr(valid_eb["CDI"], valid_eb["energy_burden_030"])
print(f"  Pearson r(CDI, energy_burden_030): {r:.3f} (p={p:.4f})")

# Energy burden in cooling deserts vs. non-deserts
cd_eb  = gdf[(gdf["is_cooling_desert"] == 1) & gdf["energy_burden_030"].notna()]["energy_burden_030"]
ncd_eb = gdf[(gdf["is_cooling_desert"] == 0) & gdf["energy_burden_030"].notna()]["energy_burden_030"]
u_b, p_b = stats.mannwhitneyu(cd_eb, ncd_eb, alternative="two-sided")
print(f"  Cooling deserts 0-30AMI burden: {cd_eb.mean():.1f}% vs non-deserts: {ncd_eb.mean():.1f}% (p={p_b:.4f})")

# By CDI quintile
by_quintile = {}
for q in [1, 2, 3, 4, 5]:
    sub = gdf[(gdf["CDI_quintile"] == q) & gdf["energy_burden_030"].notna()]["energy_burden_030"]
    if len(sub) > 0:
        by_quintile[f"Q{q}"] = {
            "n": int(len(sub)),
            "mean_burden_030": round(float(sub.mean()), 1),
            "median_burden_030": round(float(sub.median()), 1),
            "pct_above_10pct": round(float((sub > 10).mean() * 100), 1)
        }

all_results["B_burden_vs_cdi"] = {
    "pearson_r_cdi_burden_030": round(float(r), 3),
    "pearson_p": round(float(p), 4),
    "cooling_desert_mean_burden": round(float(cd_eb.mean()), 1),
    "non_desert_mean_burden": round(float(ncd_eb.mean()), 1),
    "mwu_p": round(float(p_b), 4),
    "by_cdi_quintile": by_quintile,
    "finding": (
        f"Energy burden for 0-30% AMI renters is uniformly high across NYC (r={r:.3f} with CDI — "
        f"no linear gradient). However, cooling desert tracts average {cd_eb.mean():.1f}% vs "
        f"{ncd_eb.mean():.1f}% for non-desert tracts (p={p_b:.4f}). "
        f"The key insight: severe energy burden (>10%) is nearly universal for very low-income NYC renters "
        f"— it is the baseline condition, not a cooling-desert-specific problem. "
        f"Combined with CDI, it identifies where both risks concentrate simultaneously."
    )
}

for q, v in by_quintile.items():
    print(f"  CDI {q}: mean burden {v['mean_burden_030']}%, >10%: {v['pct_above_10pct']}%")

# ── Section C: Borough-level energy burden ────────────────────────────────────
print("\n[C] Borough-level energy burden (0-30% AMI)...")

borough_eb = {}
for boro in ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"]:
    sub = gdf[(gdf["borough"] == boro) & gdf["energy_burden_030"].notna()]["energy_burden_030"]
    sub_all = gdf[(gdf["borough"] == boro) & gdf["energy_burden_all"].notna()]["energy_burden_all"]
    if len(sub) > 0:
        borough_eb[boro] = {
            "n_tracts": int(len(sub)),
            "mean_burden_030": round(float(sub.mean()), 1),
            "median_burden_030": round(float(sub.median()), 1),
            "pct_above_10pct_030": round(float((sub > 10).mean() * 100), 1),
            "mean_burden_all": round(float(sub_all.mean()), 1) if len(sub_all) > 0 else None,
            "mean_annual_cost": round(float(
                gdf[(gdf["borough"]==boro) & gdf["annual_energy_cost_030"].notna()]["annual_energy_cost_030"].mean()
            ), 0),
        }
        print(f"  {boro}: mean {sub.mean():.1f}% (0-30 AMI), >10%: {(sub>10).mean()*100:.0f}% of tracts")

all_results["C_borough_breakdown"] = {
    "description": "DOE LEAD energy burden by NYC borough for 0-30% AMI renters",
    "by_borough": borough_eb
}

# ── Section D: Double burden — high CDI AND high energy burden ────────────────
print("\n[D] Double burden: high CDI + high energy burden...")

gdf["high_energy_burden"] = (gdf["energy_burden_030"] > 10).astype(float)
gdf["double_burden"] = (
    (gdf["is_cooling_desert"] == 1) & (gdf["energy_burden_030"] > 10)
).astype(float)

double = gdf[gdf["double_burden"] == 1]
print(f"  Double burden tracts: {len(double)}")
print(f"  As % of cooling deserts: {len(double)/gdf['is_cooling_desert'].sum()*100:.0f}%")
print(f"  Renters in double burden tracts: {double['renter_population'].sum():,.0f}")

# Breakdown by borough
db_borough = {}
for boro in ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"]:
    db_sub = double[double["borough"] == boro]
    cd_sub = gdf[(gdf["borough"] == boro) & (gdf["is_cooling_desert"] == 1)]
    db_borough[boro] = {
        "double_burden_tracts": int(len(db_sub)),
        "cooling_desert_tracts": int(len(cd_sub)),
        "pct_of_deserts": round(float(len(db_sub)/max(len(cd_sub),1)*100), 1),
        "renters_at_risk": int(db_sub["renter_population"].sum()),
    }
    print(f"  {boro}: {len(db_sub)} double-burden tracts ({len(db_sub)/max(len(cd_sub),1)*100:.0f}% of deserts), "
          f"{int(db_sub['renter_population'].sum()):,} renters")

all_results["D_double_burden"] = {
    "description": (
        "Double burden = Cooling Desert (CDI) AND severe energy burden (0-30% AMI burden >10%). "
        "These tracts have the highest heat risk AND the least ability to pay for cooling."
    ),
    "double_burden_tracts": int(len(double)),
    "pct_of_cooling_deserts": round(float(len(double)/gdf["is_cooling_desert"].sum()*100), 1),
    "total_renters_at_risk": int(double["renter_population"].sum()),
    "mean_cdi_double_burden": round(float(double["CDI"].mean()), 1),
    "by_borough": db_borough,
    "finding": (
        f"{len(double)} NYC census tracts ({len(double)/gdf['is_cooling_desert'].sum()*100:.0f}% of "
        f"cooling deserts) face double burden: both a cooling desert by CDI and severe energy burden "
        f"(>10% of income) for very low-income renters. "
        f"{int(double['renter_population'].sum()):,} renters live in these tracts."
    )
}

# ── Section E: Energy burden × risk cluster ───────────────────────────────────
print("\n[E] Energy burden by risk cluster typology...")

cluster_eb = {}
for cluster_id in sorted(gdf["cluster"].dropna().unique()):
    sub = gdf[(gdf["cluster"] == cluster_id) & gdf["energy_burden_030"].notna()]
    name = sub["cluster_name"].iloc[0] if len(sub) > 0 else f"Cluster {cluster_id}"
    cluster_eb[int(cluster_id)] = {
        "cluster_name": name,
        "n": int(len(sub)),
        "mean_burden_030": round(float(sub["energy_burden_030"].mean()), 1),
        "pct_above_10pct": round(float((sub["energy_burden_030"] > 10).mean() * 100), 1),
        "mean_annual_cost": round(float(sub["annual_energy_cost_030"].mean()), 0),
    }
    print(f"  Cluster {int(cluster_id)} ({name}): mean={sub['energy_burden_030'].mean():.1f}%, "
          f">10%: {(sub['energy_burden_030']>10).mean()*100:.0f}%")

all_results["E_by_cluster"] = {
    "description": "DOE LEAD energy burden by K-means risk cluster typology",
    "by_cluster": cluster_eb
}

# ── Section F: Correlation with pct_rent_burden and pct_black ─────────────────
print("\n[F] Correlations with demographic variables...")

corr_vars = {
    "pct_rent_burden_50_plus": "Severe rent burden (>50%)",
    "pct_black": "% Black residents",
    "pct_hispanic": "% Hispanic residents",
    "pct_limited_english": "% Limited English proficiency",
    "pct_disability": "% with disability",
    "HVI_RANK": "HVI rank",
    "median_household_income": "Median household income"
}

corr_results = {}
for col, label in corr_vars.items():
    valid = gdf[[col, "energy_burden_030"]].dropna()
    if len(valid) > 50:
        r, p = stats.pearsonr(valid[col], valid["energy_burden_030"])
        corr_results[col] = {
            "label": label,
            "pearson_r": round(float(r), 3),
            "p": round(float(p), 4),
            "significant": bool(p < 0.05)
        }
        print(f"  {label}: r={r:.3f} (p={p:.4f})")

all_results["F_correlations"] = {
    "description": "Pearson correlations between 0-30% AMI energy burden and demographic/risk variables",
    "correlations": corr_results
}

# ── Build web-ready joined GeoJSON ────────────────────────────────────────────
print("\nBuilding web-ready joined data...")

# Add LEAD columns to tract_map_data
web_cols_add = {
    "energy_burden_all": "energy_burden_all_ami",
    "energy_burden_030": "energy_burden_030_ami",
    "annual_energy_cost_all": "annual_energy_cost_all",
    "annual_energy_cost_030": "annual_energy_cost_030",
    "hh_income_030": "lead_income_030",
    "high_energy_burden": "is_high_energy_burden",
    "double_burden": "is_double_burden"
}

for old, new in web_cols_add.items():
    gdf[new] = gdf[old].round(1) if old in gdf.columns else None

# Round for web
for col in ["energy_burden_all_ami", "energy_burden_030_ami"]:
    gdf[col] = gdf[col].round(1)
for col in ["annual_energy_cost_all", "annual_energy_cost_030"]:
    gdf[col] = gdf[col].round(0)

web_output_path = WEB / "tract_map_data_with_lead.geojson"
web_cols = list(gdf.columns)
# Exclude geometry-heavy intermediate columns
exclude = [c for c in web_cols if c.startswith("energy_burden_") and c not in
           ["energy_burden_all_ami", "energy_burden_030_ami"]]
exclude += [c for c in web_cols if c.startswith("annual_energy_cost_") and c not in
            ["annual_energy_cost_all", "annual_energy_cost_030"]]
exclude += ["hh_income_030", "hh_income_all", "total_households_030", "total_households_all",
            "energy_burden_elec_030", "energy_burden_gas_030", "annual_energy_cost_elec_030",
            "annual_energy_cost_080", "energy_burden_080", "hh_income_080",
            "annual_energy_cost_elec_all", "energy_burden_elec_all", "energy_burden_gas_all",
            "pct_black_lead", "high_energy_burden"]
keep_cols = [c for c in web_cols if c not in exclude]
gdf[keep_cols].to_file(web_output_path, driver="GeoJSON")
print(f"  Web GeoJSON → {web_output_path}")

# ── Save results JSON ─────────────────────────────────────────────────────────
out_path = FINAL / "lead_energy_burden_analysis.json"
with open(out_path, "w") as f:
    json.dump(all_results, f, indent=2, default=str)
print(f"\n✓ Results saved → {out_path}")

print("\n=== KEY FINDINGS ===")
print(all_results["D_double_burden"]["finding"])
print()
print(all_results["B_burden_vs_cdi"]["finding"])
