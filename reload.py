import os

apps = ["read", "guide", "game", "conf", "appstore"]

for app in apps:
    os.system(f"rm -f apps/{app}.zip")
    
    os.system(f"cd app/{app} && zip -r ../../apps/{app}.zip .")
    
    print(app)