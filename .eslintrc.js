module.exports = {
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest", // Allows the use of modern ECMAScript features
		sourceType: "module", // Allows for the use of imports
	},
	extends: ["plugin:@typescript-eslint/recommended"], // Uses the linting rules from @typescript-eslint/eslint-plugin
	env: {
		node: true, // Enable Node.js global variables
	},
	"rules": {
		// enable additional rules
		"indent": ["error", 4],
		"linebreak-style": ["error", "unix"],
		"quotes": ["error", "double"],
		"semi": ["error", "always"],

		// override configuration set by extending "eslint:recommended"
		"no-empty": "warn",
		"no-cond-assign": ["error", "always"],

		// disable rules from base configurations
		 "for-direction": "off",
	}
}