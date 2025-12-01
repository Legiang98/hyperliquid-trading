.PHONY: db-up db-down db-restart

db-up:
	docker-compose -f docker-compose.yaml up -d

db-stop:
	docker-compose -f docker-compose.yaml stop
	
db-down:
	docker-compose -f docker-compose.yaml down

db-restart:
	docker-compose -f docker-compose.yaml down
	docker-compose -f docker-compose.yaml up -d
