export class InputChain {
	private _chained: string = '';

	get current(): string {
		return this._chained;
	}

	get hasChain(): boolean {
		return this._chained.length > 0;
	}

	append(token: string): string {
		this._chained += token;
		return this._chained;
	}

	consume(finalToken: string = ''): string {
		const result = this._chained ? this._chained + finalToken : finalToken;
		this._chained = '';
		return result;
	}

	clear(): void {
		this._chained = '';
	}
}
