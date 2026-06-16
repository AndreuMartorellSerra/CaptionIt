\set jwt_secret 'replace-with-a-secure-jwt-secret'
\set jwt_exp '86400' 

ALTER ROLE authenticator SET "app.settings.jwt_secret" TO 'replace-with-a-secure-jwt-secret';
ALTER ROLE authenticator SET "app.settings.jwt_exp" TO '86400';