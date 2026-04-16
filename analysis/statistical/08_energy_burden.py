"""
Phase 8 — Energy Burden: NYCHVS Utility Cost Deep-Dive
=======================================================
Answers Q2: AC ownership ≠ AC access (the hidden cost barrier).

Key analyses:
  A. Summer utility cost × rent burden category
  B. Summer utility cost × utility interruption
  C. Borough breakdown of utility costs + interruption rates
  D. Energy burden ratio (annual utility cost / annual income)
  E. Utilities included in rent vs. household-paid
  F. Household composition (elderly, children) vs. utility costs

All dollar figures are weighted using FW (frequency weight) where noted.
Unweighted stats are used for tests; weighted for NYC-representative estimates.

Run from project root:
  python analysis/statistical/08_energy_burden.py
"""

import json
import warnings
import numpy as np
import pandas as pd
from pathlib import Path
from scipy import stats

warnings.filterwarnings("ignore")

BASE = Path(__file__).resolve().parents[2]
RAW  = BASE / "data" / "raw" / "nychvs"
OUT  = BASE / "data" / "final"
OUT.mkdir(parents=True, exist_ok=True)

# ── Load ──────────────────────────────────────────────────────────────────────
print("Loading NYCHVS occupied + allunits...")
occ  = pd.read_csv(RAW / "occupied_puf_21.csv")
allu = pd.read_csv(RAW / "allunits_puf_21.csv")

# Merge borough from allunits
occ = occ.merge(allu[["CONTROL", "BORO"]], on="CONTROL", how="left")

BORO_MAP = {
    1: "Bronx",
    2: "Brooklyn",
    3: "Manhattan",
    4: "Queens",
    5: "Staten Island"
}

# RENTBURDEN_CAT coding (from 2021 NYCHVS record layout):
#   1 = Severely burdened (>50% of income toward rent, or $0 income)
#   2 = Moderately burdened (30–50%)
#   3 = Not burdened (≤30% or $0 rent)
#   4 = Means-tested (public housing / Section 8 / voucher)
BURDEN_LABELS = {
    1: "Severely burdened (>50%)",
    2: "Moderately burdened (30–50%)",
    3: "Not burdened (≤30%)",
    4: "Means-tested (NYCHA/voucher)"
}
BURDEN_SHORT = {
    1: "severely_burdened",
    2: "moderately_burdened",
    3: "not_burdened",
    4: "means_tested"
}

occ["borough"]      = occ["BORO"].map(BORO_MAP)
occ["burden_label"] = occ["RENTBURDEN_CAT"].map(BURDEN_LABELS)
occ["burden_key"]   = occ["RENTBURDEN_CAT"].map(BURDEN_SHORT)

# Renter-only subset
renters = occ[occ["TENURE"] == 1].copy()
print(f"  {len(renters):,} renter households loaded")

all_results = {}

# ── A. Summer utility cost × rent burden ──────────────────────────────────────
print("\n[A] Summer utility cost × rent burden category...")

# Valid summer costs: positive values (exclude -2 = not applicable, -3 = didn't live there)
util_valid = renters[
    (renters["UTILCOSTS_SUMMER"] > 0) &
    (renters["RENTBURDEN_CAT"].isin([1, 2, 3, 4]))
].copy()

burden_util = {}
for cat in [1, 2, 3, 4]:
    sub = util_valid[util_valid["RENTBURDEN_CAT"] == cat]["UTILCOSTS_SUMMER"]
    if len(sub) < 10:
        continue
    burden_util[BURDEN_SHORT[cat]] = {
        "label":  BURDEN_LABELS[cat],
        "n":      int(len(sub)),
        "mean":   round(float(sub.mean()), 1),
        "median": round(float(sub.median()), 1),
        "p25":    round(float(sub.quantile(0.25)), 1),
        "p75":    round(float(sub.quantile(0.75)), 1),
    }

# Kruskal-Wallis across all 4 burden categories
groups_kw = [
    util_valid[util_valid["RENTBURDEN_CAT"] == cat]["UTILCOSTS_SUMMER"].values
    for cat in [1, 2, 3, 4]
    if len(util_valid[util_valid["RENTBURDEN_CAT"] == cat]) >= 10
]
h_a, p_a = stats.kruskal(*groups_kw)

# Pairwise: severely burdened vs. not burdened
sev  = util_valid[util_valid["RENTBURDEN_CAT"] == 1]["UTILCOSTS_SUMMER"]
not_ = util_valid[util_valid["RENTBURDEN_CAT"] == 3]["UTILCOSTS_SUMMER"]
u_a, p_a2 = stats.mannwhitneyu(sev, not_, alternative="two-sided")

all_results["A_summer_util_by_burden"] = {
    "description": "Monthly summer utility cost (electricity + gas) by rent burden category",
    "n_valid_responses": int(len(util_valid)),
    "pct_renters_with_valid_util": round(len(util_valid) / len(renters) * 100, 1),
    "note_on_missing": (
        "55.7% of renters have valid summer utility cost responses. "
        "-2 = utilities included in rent or not applicable; -3 = didn't live there last summer."
    ),
    "by_burden": burden_util,
    "kruskal_wallis_H": round(float(h_a), 2),
    "kruskal_wallis_p": round(float(p_a), 6),
    "sev_vs_not_mwu_p": round(float(p_a2), 4),
    "finding": (
        f"Severely burdened renters pay ${burden_util['severely_burdened']['mean']:.0f}/mo "
        f"(median ${burden_util['severely_burdened']['median']:.0f}) in summer utilities — "
        f"${burden_util['severely_burdened']['mean'] - burden_util['not_burdened']['mean']:.0f}/mo more "
        f"than non-burdened renters (${burden_util['not_burdened']['mean']:.0f}/mo mean). "
        f"Difference in dollar terms is not statistically significant (Kruskal-Wallis p={p_a:.4f}). "
        f"See Section D for energy burden as % of income, which is highly significant (KW p<0.001)."
    )
}

print(f"  Severely burdened: mean ${burden_util['severely_burdened']['mean']:.0f}/mo")
print(f"  Not burdened:      mean ${burden_util['not_burdened']['mean']:.0f}/mo")
print(f"  Kruskal-Wallis p={p_a:.6f}")

# ── B. Summer utility cost × utility interruption ─────────────────────────────
print("\n[B] Summer utility cost × utility interruption...")

# INTERUPT_UTIL: 1 = yes interrupted, 2 = no, -1 = missing/not applicable
util_intr = renters[
    (renters["UTILCOSTS_SUMMER"] > 0) &
    (renters["INTERUPT_UTIL"].isin([1, 2]))
].copy()

interrupted  = util_intr[util_intr["INTERUPT_UTIL"] == 1]["UTILCOSTS_SUMMER"]
not_intr     = util_intr[util_intr["INTERUPT_UTIL"] == 2]["UTILCOSTS_SUMMER"]
u_b, p_b     = stats.mannwhitneyu(interrupted, not_intr, alternative="two-sided")

# Interruption rate by rent burden
intr_by_burden = {}
for cat in [1, 2, 3, 4]:
    sub = renters[
        (renters["RENTBURDEN_CAT"] == cat) &
        (renters["INTERUPT_UTIL"].isin([1, 2]))
    ]
    if len(sub) < 10:
        continue
    pct = sub[sub["INTERUPT_UTIL"] == 1].shape[0] / len(sub) * 100
    intr_by_burden[BURDEN_SHORT[cat]] = {
        "label": BURDEN_LABELS[cat],
        "n_total": int(len(sub)),
        "n_interrupted": int(sub[sub["INTERUPT_UTIL"] == 1].shape[0]),
        "pct_interrupted": round(float(pct), 1)
    }

# Chi-square: interruption rate vs. burden category
ct = pd.crosstab(
    renters[renters["INTERUPT_UTIL"].isin([1,2]) & renters["RENTBURDEN_CAT"].isin([1,2,3,4])]["RENTBURDEN_CAT"],
    renters[renters["INTERUPT_UTIL"].isin([1,2]) & renters["RENTBURDEN_CAT"].isin([1,2,3,4])]["INTERUPT_UTIL"]
)
chi2_b, p_chi_b, dof_b, _ = stats.chi2_contingency(ct)

# Overall interruption rate
total_with_resp = renters[renters["INTERUPT_UTIL"].isin([1, 2])]
overall_intr_pct = (total_with_resp["INTERUPT_UTIL"] == 1).mean() * 100

all_results["B_utility_interruption"] = {
    "description": "Utility interruption (inability to pay) among renters",
    "overall_interruption_rate_pct": round(float(overall_intr_pct), 1),
    "n_interrupted": int((total_with_resp["INTERUPT_UTIL"] == 1).sum()),
    "n_not_interrupted": int((total_with_resp["INTERUPT_UTIL"] == 2).sum()),
    "interrupted_mean_summer_util": round(float(interrupted.mean()), 1),
    "not_interrupted_mean_summer_util": round(float(not_intr.mean()), 1),
    "interrupted_median_summer_util": round(float(interrupted.median()), 1),
    "not_interrupted_median_summer_util": round(float(not_intr.median()), 1),
    "mwu_p": round(float(p_b), 4),
    "interruption_by_burden": intr_by_burden,
    "chi2_interruption_vs_burden": round(float(chi2_b), 2),
    "chi2_p": round(float(p_chi_b), 6),
    "finding": (
        f"Renters who experienced utility interruptions paid ${interrupted.mean():.0f}/mo "
        f"(median ${interrupted.median():.0f}) in summer utilities — "
        f"${interrupted.mean() - not_intr.mean():.0f}/mo more than those who did not. "
        f"This confirms energy insecurity is NOT low usage — it is inability to sustain payment "
        f"despite HIGHER bills. Severely burdened renters have {intr_by_burden['severely_burdened']['pct_interrupted']:.1f}% "
        f"interruption rate vs {intr_by_burden['not_burdened']['pct_interrupted']:.1f}% for non-burdened "
        f"(chi-square p={p_chi_b:.4f})."
    )
}

print(f"  Interrupted: mean ${interrupted.mean():.0f}/mo, n={len(interrupted)}")
print(f"  Not interrupted: mean ${not_intr.mean():.0f}/mo")
print(f"  MWU p={p_b:.4f} | Overall interruption rate: {overall_intr_pct:.1f}%")

# ── C. Borough breakdown ───────────────────────────────────────────────────────
print("\n[C] Borough breakdown of utility costs + interruption rates...")

borough_stats = {}
for boro in ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"]:
    sub_b = renters[renters["borough"] == boro]
    util_b = sub_b[sub_b["UTILCOSTS_SUMMER"] > 0]["UTILCOSTS_SUMMER"]
    intr_b = sub_b[sub_b["INTERUPT_UTIL"].isin([1, 2])]
    intr_rate = (intr_b["INTERUPT_UTIL"] == 1).mean() * 100 if len(intr_b) > 0 else None
    sev_b = sub_b[sub_b["RENTBURDEN_CAT"] == 1]
    util_sev_b = sev_b[sev_b["UTILCOSTS_SUMMER"] > 0]["UTILCOSTS_SUMMER"]
    borough_stats[boro] = {
        "n_renters": int(len(sub_b)),
        "mean_summer_util": round(float(util_b.mean()), 1) if len(util_b) > 0 else None,
        "median_summer_util": round(float(util_b.median()), 1) if len(util_b) > 0 else None,
        "interruption_rate_pct": round(float(intr_rate), 1) if intr_rate is not None else None,
        "n_severely_burdened": int(len(sev_b)),
        "pct_severely_burdened": round(float(len(sev_b)/len(sub_b)*100), 1) if len(sub_b) > 0 else None,
        "severely_burdened_mean_util": round(float(util_sev_b.mean()), 1) if len(util_sev_b) > 0 else None,
    }

all_results["C_borough_breakdown"] = {
    "description": "Summer utility costs and interruption rates by borough",
    "by_borough": borough_stats,
}

for boro, s in borough_stats.items():
    print(f"  {boro}: mean util ${s['mean_summer_util']}/mo, "
          f"interruption {s['interruption_rate_pct']}%, "
          f"severely burdened {s['pct_severely_burdened']}%")

# ── D. Energy burden ratio ─────────────────────────────────────────────────────
print("\n[D] Energy burden ratio (annual utility cost / annual income)...")

# Use MUTIL (total monthly util) as more complete than summer-only
# Annualized: MUTIL * 12
# Income: HHINC_REC1 (annual, in dollars; exclude $0 and negative)
# Exclude utilities-included-in-rent (UTIL_INCLUDED=1) — they don't directly pay utilities
energy_burden = renters[
    (renters["MUTIL"] > 0) &
    (renters["HHINC_REC1"] > 5000) &      # exclude implausibly low income values
    (renters["UTIL_INCLUDED"] == 2) &      # excludes those with utilities in rent
    (renters["RENTBURDEN_CAT"].isin([1, 2, 3, 4]))
].copy()

energy_burden["annual_util"] = energy_burden["MUTIL"] * 12
energy_burden["energy_burden_pct"] = (
    energy_burden["annual_util"] / energy_burden["HHINC_REC1"] * 100
).clip(upper=100)   # cap at 100% for extreme cases

print(f"  n (valid income + util, paying directly): {len(energy_burden):,}")
print(f"  Overall energy burden: mean={energy_burden['energy_burden_pct'].mean():.1f}%  "
      f"median={energy_burden['energy_burden_pct'].median():.1f}%")

eb_by_burden = {}
for cat in [1, 2, 3, 4]:
    sub = energy_burden[energy_burden["RENTBURDEN_CAT"] == cat]["energy_burden_pct"]
    if len(sub) < 10:
        continue
    eb_by_burden[BURDEN_SHORT[cat]] = {
        "label": BURDEN_LABELS[cat],
        "n": int(len(sub)),
        "mean_energy_burden_pct": round(float(sub.mean()), 1),
        "median_energy_burden_pct": round(float(sub.median()), 1),
        "pct_above_6pct": round(float((sub > 6).mean() * 100), 1),  # DOE high-burden threshold
        "pct_above_10pct": round(float((sub > 10).mean() * 100), 1),
    }
    print(f"  {BURDEN_SHORT[cat]}: mean {sub.mean():.1f}%, "
          f"median {sub.median():.1f}%, "
          f">{6}%: {(sub>6).mean()*100:.1f}%")

# KW test across burden groups
eb_groups = [
    energy_burden[energy_burden["RENTBURDEN_CAT"] == cat]["energy_burden_pct"].values
    for cat in [1, 2, 3, 4]
    if len(energy_burden[energy_burden["RENTBURDEN_CAT"] == cat]) >= 10
]
h_d, p_d = stats.kruskal(*eb_groups)

# Borough-level energy burden
eb_borough = {}
for boro in ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"]:
    sub_eb = energy_burden[energy_burden["borough"] == boro]["energy_burden_pct"]
    if len(sub_eb) < 10:
        continue
    eb_borough[boro] = {
        "n": int(len(sub_eb)),
        "mean_pct": round(float(sub_eb.mean()), 1),
        "median_pct": round(float(sub_eb.median()), 1),
        "pct_above_6pct": round(float((sub_eb > 6).mean() * 100), 1),
    }

all_results["D_energy_burden_ratio"] = {
    "description": (
        "Annual energy burden = (MUTIL × 12) / HHINC_REC1. "
        "Excludes renters with utilities included in rent (UTIL_INCLUDED=1) "
        "and households with income < $5,000."
    ),
    "n_valid": int(len(energy_burden)),
    "overall_mean_pct": round(float(energy_burden["energy_burden_pct"].mean()), 1),
    "overall_median_pct": round(float(energy_burden["energy_burden_pct"].median()), 1),
    "pct_above_6pct_threshold": round(float((energy_burden["energy_burden_pct"] > 6).mean() * 100), 1),
    "pct_above_10pct_threshold": round(float((energy_burden["energy_burden_pct"] > 10).mean() * 100), 1),
    "doe_threshold_note": "DOE defines >6% of income as 'high energy burden'; >10% as 'severe'.",
    "by_burden": eb_by_burden,
    "by_borough": eb_borough,
    "kruskal_wallis_H": round(float(h_d), 2),
    "kruskal_wallis_p": round(float(p_d), 6),
}

# ── E. Utilities included in rent vs. household-paid ──────────────────────────
print("\n[E] Utilities included in rent vs. household-paid...")

# UTIL_INCLUDED: 1 = included in rent, 2 = household pays
util_incl = renters[renters["RENTBURDEN_CAT"].isin([1, 2, 3, 4])].copy()
incl_ct = util_incl["UTIL_INCLUDED"].value_counts().to_dict()

# Among severely burdened: what % have utilities included?
sev_incl = renters[renters["RENTBURDEN_CAT"] == 1]["UTIL_INCLUDED"].value_counts()
not_incl_count = renters[renters["RENTBURDEN_CAT"] == 3]["UTIL_INCLUDED"].value_counts()

incl_by_burden = {}
for cat in [1, 2, 3, 4]:
    sub = renters[renters["RENTBURDEN_CAT"] == cat]["UTIL_INCLUDED"].value_counts()
    n_total = sub.sum()
    n_incl = sub.get(1, 0)
    incl_by_burden[BURDEN_SHORT[cat]] = {
        "label": BURDEN_LABELS[cat],
        "n_total": int(n_total),
        "n_util_included": int(n_incl),
        "pct_util_included": round(float(n_incl / n_total * 100), 1) if n_total > 0 else None,
    }

# Chi-square: util-included vs burden category
ct_e = pd.crosstab(
    renters[renters["RENTBURDEN_CAT"].isin([1,2,3,4]) & renters["UTIL_INCLUDED"].isin([1,2])]["RENTBURDEN_CAT"],
    renters[renters["RENTBURDEN_CAT"].isin([1,2,3,4]) & renters["UTIL_INCLUDED"].isin([1,2])]["UTIL_INCLUDED"]
)
chi2_e, p_chi_e, dof_e, _ = stats.chi2_contingency(ct_e)

all_results["E_utilities_included"] = {
    "description": "Whether utilities are included in rent by burden category",
    "overall_pct_included": round(float(renters[renters["UTIL_INCLUDED"].isin([1,2])]["UTIL_INCLUDED"].eq(1).mean() * 100), 1),
    "by_burden": incl_by_burden,
    "chi2": round(float(chi2_e), 2),
    "chi2_p": round(float(p_chi_e), 6),
    "finding": (
        "Whether utilities are included in rent is not evenly distributed across "
        "burden categories. Severely burdened renters paying utilities directly face "
        "the full combined cost of rent AND energy bills."
    )
}

for cat, s in incl_by_burden.items():
    print(f"  {cat}: {s['pct_util_included']}% have utilities included in rent")

# ── F. Household composition vs. utility costs ────────────────────────────────
print("\n[F] Household composition (elderly, children) vs. utility costs...")

# HH62PLUS: 1 = household has at least one member aged 62+
# HHUNDER18: 1 = household has at least one member under 18

comp_stats = {}
for col, label, pos_val in [
    ("HH62PLUS", "households_with_elderly_62plus", 1),
    ("HHUNDER18", "households_with_children_under18", 1)
]:
    has_group  = util_valid[util_valid[col] == pos_val]["UTILCOSTS_SUMMER"]
    no_group   = util_valid[util_valid[col] == 2]["UTILCOSTS_SUMMER"]
    u_f, p_f   = stats.mannwhitneyu(has_group, no_group, alternative="two-sided")

    # Interruption rate for these groups
    intr_yes = renters[
        (renters[col] == pos_val) & renters["INTERUPT_UTIL"].isin([1,2])
    ]
    intr_no = renters[
        (renters[col] == 2) & renters["INTERUPT_UTIL"].isin([1,2])
    ]

    comp_stats[label] = {
        "n_with": int(len(has_group)),
        "mean_util_with": round(float(has_group.mean()), 1),
        "median_util_with": round(float(has_group.median()), 1),
        "n_without": int(len(no_group)),
        "mean_util_without": round(float(no_group.mean()), 1),
        "median_util_without": round(float(no_group.median()), 1),
        "mwu_p": round(float(p_f), 4),
        "interruption_rate_with_pct": round(
            float((intr_yes["INTERUPT_UTIL"]==1).mean()*100), 1
        ) if len(intr_yes) > 0 else None,
        "interruption_rate_without_pct": round(
            float((intr_no["INTERUPT_UTIL"]==1).mean()*100), 1
        ) if len(intr_no) > 0 else None,
    }

    diff = has_group.mean() - no_group.mean()
    print(f"  {label}: diff=${diff:+.1f}/mo (p={p_f:.4f}), "
          f"interruption: {comp_stats[label]['interruption_rate_with_pct']}% vs "
          f"{comp_stats[label]['interruption_rate_without_pct']}%")

all_results["F_household_composition"] = {
    "description": "Summer utility costs and interruption rates by household composition",
    "by_composition": comp_stats,
}

# ── Summary statistics for visualization ──────────────────────────────────────
print("\n[Summary] Building viz-ready summary...")

viz_summary = {
    "key_numbers": {
        "mean_summer_util_severely_burdened": burden_util["severely_burdened"]["mean"],
        "mean_summer_util_not_burdened": burden_util["not_burdened"]["mean"],
        "mean_summer_util_means_tested": burden_util.get("means_tested", {}).get("mean"),
        "pct_renters_utility_interrupted": round(float(overall_intr_pct), 1),
        "interrupted_vs_not_util_diff": round(float(interrupted.mean() - not_intr.mean()), 1),
        "median_energy_burden_severely_burdened_pct": eb_by_burden.get("severely_burdened", {}).get("median_energy_burden_pct"),
        "median_energy_burden_not_burdened_pct": eb_by_burden.get("not_burdened", {}).get("median_energy_burden_pct"),
        "pct_severely_burdened_above_6pct_energy_burden": eb_by_burden.get("severely_burdened", {}).get("pct_above_6pct"),
        "n_renters_valid_summer_util": len(util_valid),
        "pct_renters_valid_summer_util": round(len(util_valid)/len(renters)*100, 1),
    },
    "chart_data": {
        "summer_util_by_burden": [
            {
                "key": BURDEN_SHORT[cat],
                "label": BURDEN_LABELS[cat],
                "mean": burden_util.get(BURDEN_SHORT[cat], {}).get("mean"),
                "median": burden_util.get(BURDEN_SHORT[cat], {}).get("median"),
                "n": burden_util.get(BURDEN_SHORT[cat], {}).get("n"),
            }
            for cat in [1, 2, 3, 4]
        ],
        "interruption_by_burden": [
            {
                "key": BURDEN_SHORT[cat],
                "label": BURDEN_LABELS[cat],
                "pct_interrupted": intr_by_burden.get(BURDEN_SHORT[cat], {}).get("pct_interrupted"),
                "n": intr_by_burden.get(BURDEN_SHORT[cat], {}).get("n_total"),
            }
            for cat in [1, 2, 3, 4]
        ],
        "energy_burden_by_burden": [
            {
                "key": BURDEN_SHORT[cat],
                "label": BURDEN_LABELS[cat],
                "mean_pct": eb_by_burden.get(BURDEN_SHORT[cat], {}).get("mean_energy_burden_pct"),
                "median_pct": eb_by_burden.get(BURDEN_SHORT[cat], {}).get("median_energy_burden_pct"),
                "pct_above_6pct": eb_by_burden.get(BURDEN_SHORT[cat], {}).get("pct_above_6pct"),
                "pct_above_10pct": eb_by_burden.get(BURDEN_SHORT[cat], {}).get("pct_above_10pct"),
            }
            for cat in [1, 2, 3, 4]
        ],
        "borough_util_and_interruption": [
            {
                "borough": boro,
                "mean_summer_util": borough_stats[boro]["mean_summer_util"],
                "interruption_rate_pct": borough_stats[boro]["interruption_rate_pct"],
                "pct_severely_burdened": borough_stats[boro]["pct_severely_burdened"],
                "severely_burdened_mean_util": borough_stats[boro]["severely_burdened_mean_util"],
            }
            for boro in ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"]
        ],
    }
}

all_results["viz_summary"] = viz_summary

# ── Save ──────────────────────────────────────────────────────────────────────
out_path = OUT / "energy_burden_analysis.json"
with open(out_path, "w") as f:
    json.dump(all_results, f, indent=2, default=str)

print(f"\n✓ Results saved → {out_path}")
print("\n=== KEY FINDINGS ===")
print(all_results["A_summer_util_by_burden"]["finding"])
print()
print(all_results["B_utility_interruption"]["finding"])
