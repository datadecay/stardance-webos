import os
import json
import glob

apps = ["guide", "game", "conf", "appstore", "term"]
appstore_apps = ["read", "notes"]

for app in apps:
    os.system(f"rm -f apps/{app}.zip")
    os.system(f"cd app/{app} && zip -r ../../apps/{app}.zip .")
    print(app)

for app in appstore_apps:
    config_path = f"app/{app}/config.json"
    app_version = "1.0.0" 
    
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config_data = json.load(f)
            app_version = config_data.get("version", "1.0.0")
    except Exception as err:
        print(f"Could not parse config for {app}: {err}.")
    #begin ai part
    old_builds = glob.glob(f"appstore/{app}@*.zip")
    for old_file in old_builds:
        try:
            os.remove(old_file)
        except OSError:
            pass
    #end ai part
    os.system(f"cd app/{app} && zip -r ../../appstore/{app}.zip .")#.@{app_version}.zip .")
    
    print(f"{app}")