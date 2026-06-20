#!/usr/bin/env expect

set timeout 30
set ip "168.231.112.221"
set user "root"
set pass "LEOVEOjco77&."

spawn ssh -o StrictHostKeyChecking=no $user@$ip

expect {
    "*password:" {
        send "$pass\r"
        exp_continue
    }
    "*# " {
        # Logged in
    }
}

send "echo '=== SYSTEMD FULL STATUS ==='\r"
expect "*# "
send "systemctl status verifymykid-backend.service --no-pager\r"
expect "*# "

send "echo '=== PS AUX ==='\r"
expect "*# "
send "ps aux | grep -E 'gunicorn|main:app' | grep -v grep\r"
expect "*# "

send "echo '=== ENV OF RUNNING PROCESSES ==='\r"
expect "*# "
send "for pid in \$(pgrep -f gunicorn); do echo \"PID \$pid env:\"; cat /proc/\$pid/environ | tr '\\0' '\\n' | grep -E 'SMTP|DATABASE|SECRET'; done\r"
expect "*# "

send "exit\r"
expect eof
