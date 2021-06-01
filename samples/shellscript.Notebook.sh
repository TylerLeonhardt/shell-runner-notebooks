# # Hello Shell Runner Notebooks
# This allows you render Shell scripts in the Notebook experience in VS Code where comments
# will be rendered as Markdown cells and code will be rendered as code cells.
# Here's an example, run this:
name="Shell Runner Notebooks"
echo "\n\nHello, $name\n\n"

# ## How it works
# 
# Today, all this extension does is run the contents of your code cell into the active terminal using the
# `vscode.window.activeTerminal.sendText(str)` API. It's up to you to make sure that your shell is the shell you expect.
# In the future, we might be able to start a specific shell  for you below but this is just a proof of concept.
# 
# Here's another small script to run:
# 
for i in 1 2 3 4 5
do
    echo "Welcome $i times"
done

ls
