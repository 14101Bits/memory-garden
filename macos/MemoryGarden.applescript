-- Compiled as an application by macos/install.command.
-- Keep the project checkout outside the app so git pull updates the UI.
on run
    try
        set bundleDirectory to POSIX path of (path to me)
        set projectPathFile to bundleDirectory & "Contents/Resources/project-root.txt"
        set projectDirectory to do shell script "/bin/cat " & quoted form of projectPathFile
        set launcherPath to projectDirectory & "/macos/launch.sh"
        do shell script "/bin/bash " & quoted form of launcherPath
    on error errorMessage
        display alert "Memory Garden couldn't start" message errorMessage as warning buttons {"OK"} default button "OK"
    end try
end run
