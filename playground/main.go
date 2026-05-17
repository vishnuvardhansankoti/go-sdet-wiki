//go:build js && wasm
// +build js,wasm

package main

import (
	"bytes"
	"syscall/js"

	"github.com/traefik/yaegi/interp"
	"github.com/traefik/yaegi/stdlib"
)

func main() {
	done := make(chan struct{}, 0)

	js.Global().Set("__run_go_code__", js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		code := js.Global().Get("__go_code__").String()

		// Capture output
		var buf bytes.Buffer

		// Create interpreter
		i := interp.New(interp.Options{
			Stdout: &buf,
			Stderr: &buf,
		})
		i.Use(stdlib.Symbols)

		// Execute code
		_, err := i.Eval(code)
		if err != nil {
			buf.WriteString("\nError: " + err.Error())
		}

		// Return output to JS
		js.Global().Set("__go_output__", buf.String())

		return nil
	}))

	<-done
}
