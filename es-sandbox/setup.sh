#!/usr/bin/env bash
#
# setup.sh has been split into two phases. Use the right one for where
# you are in the workshop timeline:
#
#   ./es-sandbox/pre-setup.sh             ← run AT HOME, before the workshop
#   ./es-sandbox/workshop-day-setup.sh    ← run AT THE WORKSHOP, after the instructor
#                                            distributes your LITELLM_API_KEY
#
# See attendee-SETUP.md for the full walkthrough.

cat <<'EOF'

setup.sh has been split into two phases.

  Pre-workshop (run this at home):
    ./es-sandbox/pre-setup.sh

  Workshop day (run this with the instructor):
    ./es-sandbox/workshop-day-setup.sh

See attendee-SETUP.md for the full walkthrough.

EOF
exit 1
