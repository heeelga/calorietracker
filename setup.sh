#!/bin/bash
set -e

echo "=== CalorieTracker Setup ==="

# Build frontend
cd /var/www/calorietracker
echo "[1/4] Frontend bauen..."
npm install
npm run build

# Install server dependencies (clean, reproducible install from the lockfile)
echo "[2/4] Server-Abhängigkeiten installieren..."
cd server
npm ci --omit=dev

# Copy .env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "WICHTIG: Bitte server/.env anpassen (DB-Zugangsdaten + JWT_SECRET)!"
  echo "  nano /var/www/calorietracker/server/.env"
  echo ""
fi

# Install systemd service
echo "[3/4] Systemd Service installieren..."
cp /var/www/calorietracker/calorietracker.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable calorietracker

echo "[4/4] Fertig!"
echo ""
echo "Service starten:   systemctl start calorietracker"
echo "Status prüfen:     systemctl status calorietracker"
echo "Logs anzeigen:     journalctl -u calorietracker -f"
