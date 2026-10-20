# VHS tape for the README recording. From the repository root: vhs docs/demo-diff.tape
# Everything between Hide and Show is setup. Everything after Show is a real command whose real
# output is recorded. test/readme-claims.test.mjs lists the only commands allowed after Show and
# runs the same commands in a fresh repository.
Output docs/demo-diff.gif
Set Shell "bash"
Set FontSize 16
Set Width 1100
Set Height 560
Set Padding 16
Set Theme "Dracula"
Set TypingSpeed 45ms
Hide
Type "export PE=$PWD && alias product-engineer='node $PE/bin/check.mjs'" Enter
Type "cd $(sh $PE/scripts/demo-setup.sh) && export PS1='$ ' && clear" Enter
Show
Type "cat msg.txt" Enter
Sleep 3s
Type "product-engineer check msg.txt --diff" Enter
Sleep 6s
Type "git add test/total.test.js" Enter
Sleep 1s
Type "product-engineer check msg.txt --diff" Enter
Sleep 6s
