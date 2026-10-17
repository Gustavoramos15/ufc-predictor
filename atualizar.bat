@echo off
REM Atualiza os dados do UFC Predictor. Basta dar dois cliques neste arquivo.
cd /d "%~dp0pipeline"
"%~dp0.venv\Scripts\python.exe" -m ufc_pipeline.atualizar
pause
