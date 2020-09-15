grammar UQMConversationLocalization;

/*
 * Grammar for parsing UQM Conversation Localization files
 */

// Parser rules:
localizations: localization+ EOF;

header:
	HEADER_START WORD HEADER_END (WHITESPACE AUDIOFILE)? NEWLINE;

text: line+;

line: (WORD | PUNCTUATION | WHITESPACE)+ NEWLINE;

localization: header text;

// Lexer rules:
fragment LOWERCASE: [a-z];
fragment UPPERCASE: [A-Z];
fragment NUMBER: [0-9];

HEADER_START: '#(';
HEADER_END: ')';

AUDIOFILE: (LOWERCASE | UPPERCASE | NUMBER | '_' | '-')+ '.ogg';

WHITESPACE: (' ' | '\t');

NEWLINE: ('\r'? '\n' | '\r')+;

WORD: (LOWERCASE | UPPERCASE | NUMBER | '_' | '-')+;

PUNCTUATION: (
		'.'
		| ','
		| '?'
		| '!'
		| ';'
		| ':'
		| '\''
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
