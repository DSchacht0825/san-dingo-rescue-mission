#!/bin/bash
cd "$(dirname "$0")"
firebase use san-diego-rescue-mission
firebase deploy --only hosting