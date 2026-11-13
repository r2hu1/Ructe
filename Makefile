.PHONY: install test-backend test-frontend test run-backend run-frontend lint

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

test-backend:
	cd backend && pytest -c pytest.ini --cov=routing_app --cov-report=term routing_app/tests/

test-frontend:
	cd frontend && npm run test

test: test-backend test-frontend

run-backend:
	cd backend && python manage.py runserver 0.0.0.0:8000

run-frontend:
	cd frontend && npm run dev

lint:
	cd frontend && npm run build
