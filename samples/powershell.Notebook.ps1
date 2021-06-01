# # Hello PowerShell Runner Notebooks
# This allows you render PowerShell scripts in the Notebook experience in VS Code where comments
# will be rendered as Markdown cells and code will be rendered as code cells.
# Here's an example, run this:
$name = 'PowerShell Runner Notebooks'
Write-Host "`n`nHello, $name!`n`n"

# ## How it works
# 
# Today, all this extension does is run the contents of your code cell into the active terminal using the
# `vscode.window.activeTerminal.sendText(str)` API. It's up to you to make sure that your shell is PowerShell.
# In the future, we might be able to start a PowerShell for you below but this is just a proof of concept.
# 
# Here's another small script to run:
# 
for ($i = 1; $i -le 100; $i++) {
    Write-Progress -Activity "Search in Progress" -Status "$i% Complete:" -PercentComplete $i
    Start-Sleep -Milliseconds 50
}
