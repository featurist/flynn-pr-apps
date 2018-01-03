PATH := node_modules/.bin:$(PATH)
DEBUG ?= pr-apps*
cucumber_normal := DEBUG=$(DEBUG) cucumberjs --backtrace
cucumber_debug := DEBUG=$(DEBUG) node --inspect-brk ./node_modules/.bin/cucumber.js

RUN_ARGS := $(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
$(eval $(RUN_ARGS):;@:)

.PHONY: test

test: standard test-memory test-local test-real

standard:
	standard $(shell git ls-files | grep -e '.js$$') $(RUN_ARGS)

test-memory:
	$(cucumber_normal) $(RUN_ARGS)

test-memory-debug:
	$(cucumber_debug) $(RUN_ARGS)

test-local:
	CUCUMBER_ASSEMBLY=local $(cucumber_normal) $(RUN_ARGS)

test-local-debug:
	CUCUMBER_ASSEMBLY=local $(cucumber_debug) $(RUN_ARGS)

test-real:
	CUCUMBER_ASSEMBLY=github $(cucumber_normal) --tags 'not @localOnly' $(RUN_ARGS)

test-real-debug:
	CUCUMBER_ASSEMBLY=github $(cucumber_debug) --tags 'not @localOnly' $(RUN_ARGS)

start:
	nf start $(RUN_ARGS)
