#!/usr/bin/env python3
"""
Run the web dashboard for the crypto trading bot
"""

import os
import sys
import subprocess
import signal
import time
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def run_dashboard():
    """Run the web dashboard"""
    print("🌐 Starting Crypto Trading Bot Dashboard...")
    print("=" * 50)

    # Check if in virtual environment
    if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("⚠️ Warning: Not in a virtual environment")
        print("   It's recommended to run in a virtual environment")
        print()

    # Check requirements
    print("📦 Checking dependencies...")
    try:
        import fastapi
        import uvicorn
        import websockets
        print("✅ All required packages are installed")
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("   Run: pip install -r requirements.txt")
        sys.exit(1)

    # Environment variables
    os.environ.setdefault('DASHBOARD_HOST', '0.0.0.0')
    os.environ.setdefault('DASHBOARD_PORT', '8000')
    os.environ.setdefault('DASHBOARD_DEBUG', 'false')

    host = os.getenv('DASHBOARD_HOST', '0.0.0.0')
    port = int(os.getenv('DASHBOARD_PORT', '8000'))
    debug = os.getenv('DASHBOARD_DEBUG', 'false').lower() == 'true'

    print(f"🚀 Starting dashboard on http://{host}:{port}")
    print(f"   Debug mode: {'ON' if debug else 'OFF'}")
    print()
    print("💡 Tips:")
    print("   - Default credentials: any username/password (demo mode)")
    print("   - Press Ctrl+C to stop the server")
    print("   - Check /api/health for service status")
    print("=" * 50)

    # Run uvicorn
    try:
        import uvicorn
        from app import app

        uvicorn.run(
            app,
            host=host,
            port=port,
            reload=debug,
            log_level="info" if not debug else "debug"
        )
    except KeyboardInterrupt:
        print("\n\n🛑 Dashboard stopped by user")
    except Exception as e:
        print(f"\n❌ Error running dashboard: {e}")
        sys.exit(1)

def install_requirements():
    """Install required packages"""
    print("📦 Installing dashboard dependencies...")

    requirements = [
        "fastapi>=0.104.0",
        "uvicorn[standard]>=0.24.0",
        "jinja2>=3.1.0",
        "python-multipart>=0.0.6",
        "websockets>=12.0"
    ]

    for req in requirements:
        print(f"   Installing {req}...")
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", req],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            print(f"❌ Failed to install {req}")
            print(result.stderr)
            return False

    print("✅ All dependencies installed successfully!")
    return True

if __name__ == "__main__":
    # Check for command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "install":
            install_requirements()
            sys.exit(0)
        elif sys.argv[1] == "--help" or sys.argv[1] == "-h":
            print("Usage: python run_dashboard.py [install]")
            print()
            print("Commands:")
            print("  install    Install required dependencies")
            print("  (none)     Run the dashboard")
            sys.exit(0)

    # Run the dashboard
    run_dashboard()