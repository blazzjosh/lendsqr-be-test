CREATE DATABASE IF NOT EXISTS lendsqr_wallet_test;
GRANT ALL PRIVILEGES ON lendsqr_wallet.* TO 'lendsqr_user'@'%';
GRANT ALL PRIVILEGES ON lendsqr_wallet_test.* TO 'lendsqr_user'@'%';
FLUSH PRIVILEGES;
