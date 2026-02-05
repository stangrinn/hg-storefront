# ON LOCAL MACHINE
# 1. Create a dump of the local database
pg_dump -U vendure -h localhost -p 6543 -d vendure -F c -f vendure_local_dump.backup

# Or if using Docker:
docker compose exec postgres pg_dump -U vendure -d vendure -F c > vendure_local_dump.backup

# 2. Copy the dump to the server
scp vendure_local_dump.backup root@116.203.235.166:/var/www/hg-site/

# 3. Copy assets files (images, videos)
rsync -avz --progress hg-storeback/static/assets/ root@116.203.235.166:/var/www/hg-site/hg-storeback/static/assets/


# ON SERVER
cd /var/www/hg-site

# 4. Stop backend to avoid conflicts
docker compose -f docker-compose.prod.yml stop backend

# 5. Restore the dump to PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres pg_restore -U vendure -d vendure -c -F c /path/to/vendure_local_dump.backup

# Or copy the file inside the container and restore:
docker cp vendure_local_dump.backup hgart-postgres:/tmp/
docker compose -f docker-compose.prod.yml exec postgres pg_restore -U vendure -d vendure -c -F c /tmp/vendure_local_dump.backup

# 6. Start backend
docker compose -f docker-compose.prod.yml start backend

# 7. Check logs
docker compose -f docker-compose.prod.yml logs backend --tail 50

# 8. Verify that data has been loaded
docker compose -f docker-compose.prod.yml exec postgres psql -U vendure -d vendure -c "SELECT COUNT(*) FROM product;"