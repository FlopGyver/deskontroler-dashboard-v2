# DeskKontrolerBridge.spec
from PyInstaller.utils.hooks import collect_submodules
from PyInstaller.utils.hooks import collect_all
import os

# --- Déps qui aiment être "hidden-import" ---
hidden = []
hidden += collect_submodules('websockets')
hidden += collect_submodules('flask_cors')

# --- Optionnel : embarquer PS_BATT_SCRIPT si tu veux l’avoir à côté de l’exe
#     Mieux: mets le .ps1 dans le même dossier que le .exe au déploiement.
datas = []
# Exemple: si tu veux copier ton .ps1 dans le même dossier que l'exe:
# datas.append((r"E:\Personnal PROJECTS\DesKontroler\Scripts Python\get_bt_battery.ps1", "."))

# --- Cas Corsair (voir notes plus bas) ---
binaries = []
# Exemple si tu veux forcer l’inclusion d’une DLL CUE locale :
# binaries.append((r"C:\Program Files\Corsair\CORSAIR iCUE 5 Software\CUESDK.x64_2019.dll", "."))
binaries.append((
    r"E:\Personnal PROJECTS\DesKontroler\cue-sdk-python-master\cue-sdk-python-master\src\cuesdk\bin\iCUESDK.x64_2019.dll", 
    "."
))
block_cipher = None

a = Analysis(
    ['deskontroler_bridge.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hidden + [
        'comtypes', 'pycaw.pycaw', 'paho.mqtt.client',
        'flask', 'flask_cors',
    ],
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    name='DeskKontrolerBridge',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,   # True si tu veux la console
    icon=None,
)
