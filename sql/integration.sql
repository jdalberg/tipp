-- will hold data snippets needed for integration with
-- other systems, i.e. a dhcp service
create table integration (
	network		integer references networks,
	keyname		varchar(100),
	value		text,
	created		integer,
	invalidated	integer,  -- 0 = still valid
	created_by	text,
	invalidated_by	text
);