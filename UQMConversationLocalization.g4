grammar UQMConversationLocalization;

/*
 * Grammar for parsing UQM Conversation Localization files
 */

// Parser rules:
localizations: localization+ EOF;

alien_header:
	HEADER_START UPPERCASE_WORD HEADER_END (WHITESPACE AUDIOFILE)? NEWLINE;

zelnick_header:
	HEADER_START LOWERCASE_WORD HEADER_END (WHITESPACE AUDIOFILE)? NEWLINE;

text: line+;

line: (
		WORD
		| LOWERCASE_WORD
		| UPPERCASE_WORD
		| PUNCTUATION
		| WHITESPACE
	)+ NEWLINE;

alien_localization: alien_header text;
zelnick_localization: zelnick_header text;

localization: (alien_localization | zelnick_localization);

// Lexer rules:
fragment LOWERCASE: [a-z];
fragment UPPERCASE: [A-Z];
fragment NUMBER: [0-9];

HEADER_START: '#(';
HEADER_END: ')';

AUDIOFILE: (LOWERCASE | UPPERCASE | NUMBER | '_' | '-')+ '.ogg';

WHITESPACE: (' ' | '\t');

NEWLINE: ('\r'? '\n' | '\r')+;

LOWERCASE_WORD: (LOWERCASE | NUMBER | '_' | '-')+;
UPPERCASE_WORD: (UPPERCASE | NUMBER | '_' | '-')+;
WORD: (LOWERCASE | UPPERCASE | NUMBER | '_' | '-')+;

PUNCTUATION: (
		'.'
		| ','
		| '?'
		| '!'
		| ';'
		| ':'
		| '\''
		| '`'
		| '"'
		| '('
		| ')'
		| '&'
		| '%'
		| '$'
		| '@'
		| '*'
		| '-'
		| '_'
	);
