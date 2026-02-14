#!/bin/bash
cd /home/kavia/workspace/code-generation/stock-insights-dashboard-239614-239623/stock_insight_analyzer_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

