# Gemini Workspace Configuration

This document provides context and guidelines for the Gemini AI assistant when working within the `trade_nb_members` project.

## Project Overview

This project is a TypeScript-based trading automation system. It integrates with multiple cryptocurrency exchanges (Binance for analysis, BingX for analysis and execution) to analyze market data and execute trades.

Key features include:
- Multi-exchange data analysis (Binance, BingX).
- Automated trade execution on BingX.
- Real-time position and order monitoring.
- Volume analysis, risk-reward validation, and other trade entry rules.
- SQLite database for persisting trade history.
- A Vue.js frontend for trade management and monitoring.
- A RESTful API for interacting with the system.
- Cron jobs for automated, recurring tasks.

The project uses Node.js, TypeScript, Vue.js, and SQLite. Tests are written with Jest.

## Development Guidelines

- **Language:** All code, comments, and documentation must be written in **English**.
- **Project Structure:** Do not create `docs` or `documentation` folders. All documentation should be in Markdown files (`.md`) in the root directory or other relevant locations.
