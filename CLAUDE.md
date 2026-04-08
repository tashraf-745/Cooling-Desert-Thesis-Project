You are an expert data scientist working on the following project.
# Cooling Deserts for Renters: Heat Equity Inside the NYC Housing System

## Thesis Proposal

Extreme heat is now the deadliest climate-related hazard in New York City, yet current public data systems continue to treat heat vulnerability, housing insecurity, and access to cooling as separate and loosely connected policy domains. Municipal tools such as the Department of Health and Mental Hygiene’s **Heat Vulnerability Index (HVI)**, the Parks Department’s **Cool It! NYC program**, and the City’s **network of cooling centers** each provide valuable but incomplete perspectives on climate risk.

None of these systems directly capture whether renters—particularly those who are severely rent burdened—can realistically protect themselves from heat either inside their homes or through accessible public cooling spaces. Many households technically live in “served” neighborhoods while lacking the financial, infrastructural, or physical capacity to cool their living environments. This project addresses that gap by reframing heat risk through the lived constraints of renters.

The core audience for this work includes:

- City agencies responsible for climate, housing, and public health policy  
- Community-based environmental justice and housing advocacy organizations  
- Researchers working at the intersection of urban data, climate adaptation, and social inequality  

This project meets their needs by producing a **spatially grounded, renter-centered framework for identifying "cooling deserts."**

**Cooling deserts** are defined as areas where:

- Heat vulnerability is high  
- Adaptive capacity is structurally constrained  

Through an **interactive website** and a **policy-oriented white paper**, the project will translate complex datasets into actionable insights that guide equitable investments in:

- Cooling infrastructure  
- Housing retrofits  
- Tenant protections  

---

# Environmental Scan and Literature Context

The dominant analytic approach to heat equity in New York City is **spatial vulnerability mapping**, most notably through the **Heat Vulnerability Index (HVI)**. The HVI identifies neighborhoods with elevated risk of heat-related mortality using indicators such as:

- Land surface temperature  
- Green space  
- Income levels  
- Prevalence of air conditioning  

The index has become a central planning tool for emergency response and climate adaptation. However, while it identifies **where risk is concentrated**, it does not explain **why residents are unable to reduce that risk** or measure the household-level constraints shaping adaptive capacity.

Public health research on heat mortality consistently shows that most heat-related deaths occur **inside the home**, and that **air conditioning access is one of the strongest protective factors**. While these studies successfully frame heat as a housing and health equity issue, they often treat air conditioning as a **binary variable** rather than a resource shaped by affordability, tenure, and building infrastructure.

As a result, they fail to capture the social and economic conditions that prevent households from using cooling technology even when it exists physically within the home.

Research on **cooling centers and public cooling infrastructure** further highlights uneven spatial distribution and accessibility barriers. Municipal audits and environmental justice studies show that cooling centers may be inaccessible due to:

- Limited hours  
- Transportation barriers  
- Safety concerns  
- Lack of public communication  

Most analyses rely on **proximity as a proxy for access**, which overlooks the lived realities of renters balancing work schedules, mobility limitations, childcare responsibilities, and personal safety.

Energy insecurity research adds another layer by demonstrating that **low-income households frequently avoid using air conditioning due to high electricity costs**, creating a hidden form of heat vulnerability. Despite its importance, this research is rarely integrated with spatial heat exposure data, housing tenure information, or public cooling infrastructure.

Similarly, **NYCHA resilience planning** and public housing studies focus on building retrofits and emergency preparedness but often remain disconnected from the broader private rental housing market.

This project bridges these gaps by:

- Retaining the **Heat Vulnerability Index** as a foundational risk layer  
- Integrating research on indoor heat exposure, cooling centers, and energy burden  
- Modeling **adaptive capacity as a constraint-based system**  
- Moving beyond proximity-based frameworks to define access as a **socio-technical condition shaped by affordability, infrastructure, and policy**  
- Benchmarking **NYCHA residents against private-market renters** using a unified definition of cooling deserts  

---

# Resources and Technical Capacity

This project will rely on a reproducible and scalable technical workflow.

### Data Processing and Analysis

Python will be used for:

- Data cleaning  
- Statistical modeling  
- Geospatial analysis  


Spatial analysis methods will include:

- Spatial joins  
- Accessibility buffers  
- Clustering  
- Regression modeling  

### Visualization and Web Development

Interactive visualizations will be developed using:

- **D3.js**
- **Observable Plot**

These tools will enable users to explore:

- Spatial patterns of heat vulnerability  
- Demographic disparities  
- Policy intervention scenarios  

The final interactive project will be deployed through **GitHub Pages** to ensure open access and version-controlled distribution.

---

# Core Datasets

The project integrates multiple public datasets into a unified geospatial framework.

Key datasets include:

- **NYC Heat Vulnerability Index (HVI)**
- **NYCHVS microdata**  
  - Air conditioning access  
  - Rent burden  
  - Income  
  - Housing tenure
- **American Community Survey (ACS)**  
  - Race  
  - Age  
  - Disability
- **Cooling infrastructure datasets**  
  - Cooling centers  
  - Cool It! NYC cooling features
- **NYCHA development locations and resident characteristics**
Together these datasets allow the project to model both:

- **Environmental heat exposure**
- **Socially constrained adaptive capacity**

---

# Ethics and Privacy

This project follows strict ethical standards to protect the communities represented in the data.

Key principles include:

- Use of **publicly available and de-identified datasets**
- No collection or display of personally identifiable information
- Aggregation of **NYCHVS data at census tract or neighborhood levels**
- Prevention of re-identification risks

All models and visualizations will be:

- Transparently documented  
- Tested for fairness  
- Designed to avoid stigmatization or misleading interpretation  

---

# Data Management Plan Overview

The project will produce structured research outputs including:

- Tabular datasets  
- Geospatial layers  
- Analytical scripts  
- Interactive visualization assets  

All outputs will be stored in **open, non-proprietary formats**:

- CSV  
- GeoJSON  
- JSON  
- Jupyter Notebooks  

The total data volume is expected to remain **under 5GB**.

### Data Sources

Data will be collected from:

- NYC Open Data  
- U.S. Census API  
- NYCHVS  
- NYCHA  

### Data Organization

The project will follow a structured repository design including:

- Standardized naming conventions  
- Hierarchical folder structures  
- Version control via GitHub  

Documentation will include:

- README files  
- Data dictionaries  
- Metadata descriptions  

Secure cloud storage with routine backups will be maintained during development.

Final datasets and code will be deposited in **CUNY Academic Works** to ensure long-term access, preservation, and reuse.

---

# Project Structure

```
Thesis Project/
│
├── data/
│   ├── raw/                        # Original, unmodified downloads
│   │   ├── hvi/                    # HVI by NTA/ZCTA
│   │   ├── acs/                    # ACS race, age, disability
│   │   ├── nychvs/                 # AC access, rent burden, income, tenure  ← MISSING
│   │   ├── cooling_centers/        # NYC cooling center locations
│   │   ├── cool_it/                # Cool It! NYC sites
│   │   ├── nycha/                  # NYCHA developments + resident data      ← MISSING
│   │   ├── canopy/                 # Tree canopy coverage
│   │   └── shapefile/              # Census tract geometries
│   │
│   ├── processed/                  # Cleaned, standardized outputs
│   │   ├── tract_level/
│   │   ├── nta_level/
│   │   └── zcta_level/
│   │
│   └── final/                      # Analysis-ready merged datasets
│       ├── cooling_desert_index.geojson
│       └── scenario_outputs/
│
├── analysis/
│   ├── 01_data_cleaning/           # Data cleaning scripts
│   ├── 02_exploratory/             # EDA, distributions, correlations
│   ├── 03_statistical/             # Regression, clustering, cross-tabs
│   ├── 04_accessibility/           # Spatial buffers, proximity analysis
│   ├── 05_cooling_desert_index/    # Composite index construction
│   └── 06_scenarios/               # Policy simulation models
│
├── notebooks/                      # Jupyter notebooks for exploration
│
├── web/                            # GitHub Pages interactive site
│   ├── index.html
│   ├── css/
│   ├── js/
│   │   ├── maps/                   # Leaflet layers
│   │   ├── charts/                 # D3 / Observable Plot
│   │   └── narrative/
│   └── data/                       # Web-optimized GeoJSON/JSON
│
├── paper/                          # White paper
│   ├── drafts/
│   ├── figures/
│   └── tables/
│
├── resources/                      # PDFs, literature, reference materials
├── Books/
└── CLAUDE.md
```

### File Migration Map

| Current Location | New Location |
|---|---|
| `Datasets/raw/` | `data/raw/` |
| `Datasets/cleaned/` | `data/processed/` and `data/final/` |
| `Datasets/Heat_Health/` | `data/raw/hvi/` |
| `Python/*.py` | `analysis/01_data_cleaning/` |
| `Resources/` | `resources/` |

### Datasets Still to Acquire

| Dataset | Source | Priority |
|---|---|---|
| NYCHVS microdata (AC access, rent burden, income, tenure) | NYC Housing and Vacancy Survey | High — core to analysis |
| NYCHA development locations + resident characteristics | NYC Open Data | High |

---

# Research Questions from the Literature and Data Answers

The following questions emerge directly from the existing body of research. Each maps to specific variables in the current dataset.

---

## 1. The HVI shows where risk is concentrated — but not why residents can't reduce it

**Sources:** Rosenthal et al. (2014), Madrigano et al. (2015), DOHMH HVI documentation

The HVI treats vulnerability as a spatial property of places, not a structural constraint of people. It identifies high-risk neighborhoods but does not capture whether households have any realistic path to cooling.

**Data answer:**
Cross-tabulate `hvi_nta_components.json` (`hvi_rank`, `pct_households_ac`) against `nyc_tract_indicators_v2.geojson` (`pct_rent_burden_50_plus`, `median_household_income`, `pct_overcrowded_renter`) via the NTA-ZIP-tract crosswalk. Produces a constraint layer on top of the HVI — neighborhoods where the score is high and households structurally cannot respond.

---

## 2. AC ownership is not the same as AC access

**Sources:** NYC Comptroller Energy Insecurity Report, Columbia Climate School (2021)

21% of renters with AC do not use it due to cost. The HVI component `PCT_HOUSEHOLDS_AC` counts ownership, not usage. This systematically understates vulnerability in rent-burdened neighborhoods.

**Data answer:**
`nychvs_renters.json` has `UTILCOSTS_SUMMER`, `INTERUPT_UTIL`, and `RENTBURDEN_CAT` at borough level. Combine with `hvi_nta_components.json` `pct_households_ac` to show that neighborhoods with moderate AC ownership but high rent burden likely have far lower effective cooling access than the HVI score implies. This is a direct methodological contribution — correcting a known bias in existing tools.

---

## 3. Does racial composition predict heat exposure beyond income alone?

**Sources:** Shaker et al. (2019), PMC study (2025), NPCC4 — Matte et al. (2024)

After controlling for geography and tree cover, +0.43°F surface temperature per 1% increase in Black residents. In Manhattan: +5.27°F. Race operates as an independent axis of heat exposure, not merely a proxy for income.

**Data answer:**
Regression in `nyc_tract_indicators_v2.geojson` using `pct_black`, `pct_hispanic`, `median_household_income` as predictors against `hvi_nta_components.json` `surface_temp_index` and `pct_greenspace`. Tests whether race predicts heat exposure above and beyond what income explains — directly replicating and extending Shaker et al. at the census tract level.

---

## 4. Do non-extreme hot days create more cumulative danger in cooling deserts than declared heat events?

**Sources:** DOHMH Heat Report (2025), NYC Hazard Mitigation Plan

Non-extreme hot days (82–94°F) cause more total deaths than days above 95°F. All policy is designed around declared emergencies. Cooling desert residents are at elevated risk on ordinary summer days.

**Data answer:**
`outdoor_heat_forecast.json` `baseline_temp_f` per NTA mapped against `hvi_nta_components.json` `hvi_rank` and `pct_rent_burden_30_plus` from tract indicators. NTAs with high baseline temperatures, high HVI, and high rent burden are structurally dangerous every summer day, not just during heat emergencies.

---

## 5. Is proximity to cooling infrastructure a false measure of access?

**Sources:** Lancet Planetary Health (2023), NYC Comptroller "Overheated & Underserved" (2022)

In disadvantaged neighborhoods, subway ridership shows no reduction on hot days — people cannot avoid heat exposure through behavioral adaptation. 83% of cooling centers are closed Sundays; 47% are age-restricted.

**Data answer:**
Spatial buffer analysis on `cool_it_sites.json` (0.25 and 0.5 mile walksheds) against `nyc_tract_indicators_v2.geojson` shows which high-HVI, high-rent-burden tracts have no outdoor cooling features within walking distance. Combine with `cooling_locations_summary.json` for borough-level distributional inequity. **Limitation:** emergency indoor cooling centers are not yet in the dataset.

---

## 6. Are NYCHA residents better or worse served than private market renters?

**Sources:** NPCC4, NYC-EJA, Columbia Climate School (2021)

21% of older NYCHA residents lack working AC. One-in-three NYCHA residents cite the monthly AC surcharge as a barrier. Existing research treats NYCHA in isolation from the private rental market.

**Data answer:**
`nycha_development_data_book.json` (average monthly rent, population, senior development status) joined to surrounding `nyc_tract_indicators_v2.geojson` via community district. Compare NYCHA average rent against ACS `pct_rent_burden_50_plus` for surrounding private renters. Also map `nycha_public_housing_developments.geojson` against `hvi_zcta.geojson` to show whether NYCHA buildings are concentrated in HVI 4–5 zones.

---

## 7. Does language access compound heat vulnerability?

**Sources:** NYC-EJA campaigns, NPCC4 compound risk findings

Immigrant and limited English proficiency (LEP) communities face barriers to receiving heat emergency communications, navigating cooling center systems, and asserting housing rights. This is rarely quantified spatially.

**Data answer:**
`nyc_tract_indicators_v2.geojson` `pct_limited_english` overlaid against `hvi_nta_components.json` and cool_it site proximity. Tracts with high LEP, high HVI, and low cooling infrastructure access represent compound exclusion from both the heat risk system and the emergency response system.

---

## 8. Does disability represent an undercounted heat risk intersection?

**Sources:** DOHMH Heat Report (89% of decedents had chronic conditions), PMC study (ages 85+ RR = 1.83)

Disability is under-quantified in the heat equity literature. Disabled renters face mobility barriers to reaching cooling centers and are physiologically more sensitive to heat.

**Data answer:**
`nyc_tract_indicators_v2.geojson` `pct_disability` (ACS B18101) cross-tabulated against `hvi_nta_components.json` `hvi_rank` and `pct_households_ac`. Tracts with high disability rates, high HVI, and low AC access are the most exposed and least able to self-protect or travel to cooling sites.

---

## 9. Does pre-1980 building stock explain AC access gaps?

**Sources:** NYCHA resilience literature, NYC energy insecurity research

Older buildings were designed without central cooling infrastructure. Window units require adequate electrical capacity. This is a physical constraint independent of household income.

**Data answer:**
`nyc_tract_indicators_v2.geojson` `pct_housing_pre_1980` correlated against `hvi_nta_components.json` `pct_households_ac` via NTA-ZCTA-tract crosswalk. A negative correlation would confirm that building age is an independent predictor of cooling access — beyond income alone.

---

## 10. Where do children and the elderly face compounded risk?

**Sources:** PMC study (ages 85+ RR = 1.83), DOHMH (highest mortality age 60+), Petkova et al. (2014)

Both groups are physiologically most vulnerable and most dependent on home cooling. They are least likely to be at work or able to travel independently to cooling sites.

**Data answer:**
`nyc_tract_indicators_v2.geojson` `pct_elderly_65_plus` and `pct_children_under_18` mapped against `hvi_zcta.geojson` and `pct_rent_burden_50_plus`. High concentrations of elderly or children with cooling constraints mark priority zones for the policy scenario simulations.

---

## Questions the Current Data Cannot Yet Answer

| Gap | Missing Dataset | Priority |
|---|---|---|
| Actual cooling center accessibility (coordinates, hours, ADA status) | Emergency cooling centers dataset | High |
| Energy costs as % of income at tract level | DOE LEAD energy burden data | High |
| Building-level landlord heat and hot water failures | HPD Heat & Hot Water Violations | High |
| Which NYCHA buildings have AC hookup infrastructure | Internal NYCHA infrastructure data | Medium |

---

# Work Plan

| Phase | Key Tasks | Target Completion |
|------|-----------|------------------|
| Data Collection & Integration | Acquire datasets (HVI, NYCHVS, ACS, cooling centers, Cool It! NYC, NYCHA); clean, geocode, standardize variables; create spatial joins and base analytical dataset | End of January |
| Advisor Check-In | Review dataset integration and initial workflow | End of January |
| Exploratory & Statistical Analysis | Conduct correlation analysis, grouped means, cross-tabulations, regression modeling, clustering; generate spatial accessibility buffers; identify preliminary cooling desert zones | Start of February |
| Scenario Simulation & Policy Testing | Model intervention scenarios such as adding cooling sites, AC retrofits, and NYCHA upgrades; estimate population shifts and equity impacts | Mid February |
| Advisor Check-In | Review early results and modeling approach | Mid February |
| Theory Integration & Framework | Apply **Data Feminism** and **Actor-Network Theory** to interpret findings and define the cooling deserts framework | End of February |
| Interactive Website Development | Build map layers, filters, legends, and narrative explanations using Leaflet and Observable | Start–Mid March |
| Visualization & Content Finalization | Finalize charts, intersectional analysis, and accessibility narratives | Mid March |
| Advisor Check-In | Review visualizations and narrative integration | Mid March |
| White Paper Drafting | Write policy analysis, results synthesis, and recommendations | End of March |
| Review & Revisions | Incorporate advisor feedback and refine analysis and presentation | Mid April |
| Final Submission & Deposit | Upload final materials to CUNY Academic Works | April 30 |

---

# ANT Theory Section — Design Notes & Outline

## Design Principles
- No cards, no icons, no emojis — typography and SVG-drawn visualizations only
- Audience has zero prior knowledge of ANT or cooling deserts
- Plain language throughout — no statistical jargon
- Each part builds on the previous; the five questions drive the narrative arc
- Always reference specific data points from the Data Story path
- Build one part at a time, one step at a time

## Visual Language
- Dark background (#1A252F) throughout theory path
- SVG networks: circles (human actor = white fill; blocking forces = orange #E07B39; measurement systems = blue #7FB3D3; heat exposure = deep red #922B21; physical constraints = warm brown #8B7355)
- Connection lines: exposure = solid red; block = dashed orange-red; miss = dotted blue
- Typography: Bogart (headings), Satoshi (body)
- Color palette: same Civic Heat tokens as rest of site
- No cards, no emoji, no icon libraries — all illustration is SVG drawn in code

## Section Structure

### Part 1 — Introduction (IN PROGRESS)
Interactive 6-step scene builder: narrates a single renter's (Maria, South Bronx) hot July night and introduces each non-human actor that traps her in the heat, one at a time. An SVG network builds on screen as each actor appears. After the final step a plain-language ANT definition fades in, followed by a numbered preview of the 5 questions. No jargon in any step.

Scene actors in order:
1. Maria — the renter (center node, white)
2. Heat — 94°F July night (top, deep red)
3. The electricity bill — $80 extra/month she doesn't have (right, orange)
4. The pre-1938 building — wiring can't safely run AC overnight (bottom, warm brown)
5. The city's heat risk index — scores her neighborhood moderate; resources go elsewhere (left, blue)
6. Reveal — full network labeled "COOLING DESERT"

### Part 2 — Five Questions (COMPLETE)
Five full sections, one per question, each with a visualization:

**Q1: Why does the city's own heat map make some neighborhoods invisible?**
ANT concept: Black-boxing + Inscription
Data anchors: 21% of AC owners can't afford to use it (NYC Comptroller 2022); 214 tracts where HVI underestimates vulnerability; all climate-adaptation funding flows through the HVI as an Obligatory Passage Point.

**Q2: What does a building's age have to do with who survives a heat wave?**
ANT concept: Non-human actants (the building as an actor with its own agency)
Data anchors: 47% NYC housing stock pre-1980; building age is a statistically significant negative predictor of AC access controlling for income (p < 0.001).

**Q3: How does a rent bill become a heat weapon?**
ANT concept: Translation + Enrollment (Michel Callon, 1986)
Data anchors: 21% of renters with AC can't afford to run it; NYCHA $25/mo surcharge deters 1-in-3 seniors; 557 cooling deserts map the outcome of this translation failure.

**Q4: Why can't a cooling center cool the people who need it most?**
ANT concept: Scripts + Network misalignment (Latour)
Data anchors: 83% of indoor emergency cooling centers closed Sundays (NYC Comptroller 2022); 47% age-restricted; 38% of high-HVI, high-rent-burden tracts have no outdoor cooling within walking distance.

**Q5: What would it actually take to break a cooling desert?**
ANT concept: Obligatory Passage Points + Network disruption (non-linear)
Data anchors: Combined scenario → 67% reduction in cooling desert tracts vs. 12–23% for any single intervention tested independently.

### Part 3 — Synthesis (COMPLETE)
Full network visualization assembling all actants from the 5 questions with labeled connections (#ant-synthesis section). Bridges back to the Data Story path via CTA. Policy implications tied to scenario findings.