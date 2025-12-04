NPM = npm

install:
	$(NPM) install

dev:
	$(NPM) run dev

build:
	$(NPM) run build

preview:
	$(NPM) run preview

clean:
	rm -rf dist

# Deployment target for GitHub Pages
deploy-gh-pages:
	@echo "Building production bundle..."
	$(NPM) run build

	@echo "Preparing temporary folder for deployment..."
	rm -rf /tmp/app_tombola_deploy || true
	mkdir -p /tmp/app_tombola_deploy
	cp -r dist/* /tmp/app_tombola_deploy/

	@echo "Initializing temporary git repository..."
	cd /tmp/app_tombola_deploy && \
		git init >/dev/null && \
		git checkout -b gh-pages >/dev/null || true && \
		git add --all >/dev/null && \
		git commit -m "Deploy to gh-pages: $$(date -u +"%Y-%m-%d %H:%M:%S")" >/dev/null

	@echo "Pushing to origin gh-pages (force)..."
	cd /tmp/app_tombola_deploy && \
		git remote add origin $$(git config --get remote.origin.url) 2>/dev/null || true && \
		git push -f origin gh-pages >/dev/null

	@echo "Cleaning temporary folder..."
	rm -rf /tmp/app_tombola_deploy

	@echo "Deploy finished. Your site should be available at: https://$$(basename $$(git config --get remote.origin.url) .git | sed 's/:/\//')/app_tombola/"

setup: install dev
