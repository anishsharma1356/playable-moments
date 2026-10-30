#!/bin/sh
set -eu
mkdir -p /out/licenses/modules
cp /usr/local/go/LICENSE /out/licenses/Go-LICENSE
go list -m all > /out/licenses/go-modules.txt
go list -m -f '{{if .Dir}}{{.Dir}}{{end}}' all | while IFS= read -r module_dir; do
  case "$module_dir" in
    /go/pkg/mod/*)
      destination="/out/licenses/modules/${module_dir#/go/pkg/mod/}"
      for notice in "$module_dir"/LICENSE* "$module_dir"/COPYING* "$module_dir"/NOTICE*; do
        [ -f "$notice" ] || continue
        mkdir -p "$destination"
        cp "$notice" "$destination/"
      done
      ;;
  esac
done
