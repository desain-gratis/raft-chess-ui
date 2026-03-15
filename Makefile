deploy:
	npm run build
	tar -czvf out.tar.gz out/

	scp out.tar.gz root@mb1:/var
	ssh root@mb1 mkdir -p /var/www/chess/
	ssh root@mb1 "cd /var && tar -xzvf out.tar.gz  && cp -r out/* www/chess"

	scp out.tar.gz root@mb2:/var
	ssh root@mb2 mkdir -p /var/www/chess/
	ssh root@mb2 "cd /var && tar -xzvf out.tar.gz  && cp -r out/* www/chess"

	scp out.tar.gz root@mb3:/var
	ssh root@mb3 mkdir -p /var/www/chess/
	ssh root@mb3 "cd /var && tar -xzvf out.tar.gz  && cp -r out/* www/chess"
