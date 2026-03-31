.PHONY: dev clean restart

LINK_IQ_DIR := ../link-iq
LINK_IQ_BIN := $(LINK_IQ_DIR)/link-iq

# Default target
dev: clean-processes build-link-iq start-link-iq rebuild-frontend start-frontend

# Kill any existing processes
clean-processes:
	@echo "Stopping existing processes..."
	@sh -c 'ps aux | grep -E "[l]ink-iq|[n]ode.*next" | awk "{print \$$2}" | xargs -r kill -9' 2>/dev/null || true
	@sleep 1

# Build the link-iq binary
build-link-iq:
	@echo "Building link-iq..."
	@cd $(LINK_IQ_DIR) && make build

# Start link-iq in the background
start-link-iq:
	@echo "Starting link-iq..."
	@cd $(LINK_IQ_DIR) && ./$(LINK_IQ_BIN) &
	@sleep 2

# Rebuild the frontend
rebuild-frontend:
	@echo "Rebuilding paperless-link frontend..."
	@pnpm build

# Start the dev server with the host flag
start-frontend:
	@echo "Starting frontend dev server on port 3333..."
	@pnpm dev --port 3333

# Convenience targets
restart: clean-processes build-link-iq start-link-iq rebuild-frontend start-frontend

clean: clean-processes
	@echo "Cleaning link-iq..."
	@cd $(LINK_IQ_DIR) && make clean

.PHONY: clean-processes build-link-iq start-link-iq rebuild-frontend start-frontend
