deploy:
	npm run build
	tar -czvf out.tar.gz out/
	scp out.tar.gz root@mb1:/var
	ssh root@mb1 "cd /var && tar -xzvf out.tar.gz  && cp -r out/* www"
