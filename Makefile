.PHONY: help install dev build start lint test test-watch clean

# Show available targets (default)
help:
	@echo "Available commands:"
	@echo "  make install     Install dependencies"
	@echo "  make dev         Start the dev server (http://localhost:3000)"
	@echo "  make build       Create a production build"
	@echo "  make start       Run the production build (requires 'make build' first)"
	@echo "  make lint        Run ESLint"
	@echo "  make test        Run unit tests once"
	@echo "  make test-watch  Run unit tests in watch mode"
	@echo "  make clean       Remove build output and dependencies"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

test:
	npm test

test-watch:
	npm run test:watch

clean:
	rm -rf .next node_modules
