# Sample Monitoring Data

These CSV files are example exports for the AI commerce monitoring workflow.

They are designed to open cleanly in:

- Excel
- Google Sheets
- Airtable
- BI tools such as Looker Studio, Power BI, and Tableau

## Files

- `example_analysis_upload_template.csv`
  Import-ready template for the upload flow on the website. This can be edited in Excel or Google Sheets and exported back to CSV for batch runs.
- `example_product_upload_sheet.csv`
  Single-sheet example file with the core product upload columns only.
- `example_monitoring_runs.csv`
  High-level summary of each monitoring run.
- `example_query_results.csv`
  Query-by-query monitoring output across assistant surfaces.
- `example_sources.csv`
  Secure citation and source influence examples for each run.
- `example_recommendations.csv`
  Example recommendations generated from the monitoring gaps.
- `example_fact_review.csv`
  Example factual-accuracy review rows for verified and flagged claims.

## Notes

- The rows are sample data for demos and dashboard design.
- They reflect the current product model: share of shelf, evidence coverage, source influence, ethics status, and recommendations.
- `run_id` is the join key across all files.
- The upload template uses the required ingestion columns: `Product Name`, `Company Name`, `Company Website`, `Product Page URL`, `Product Category`, `Target Audience`, `Location`, `Competitor Brands`, and `Authoritative Product Facts`.
