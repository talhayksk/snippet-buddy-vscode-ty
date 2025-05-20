import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let snippetStoragePath: string;

export function activate(context: vscode.ExtensionContext) {
	snippetStoragePath = path.join(context.globalStorageUri.fsPath, 'snippets.json');

	// Klasör yoksa oluştur
	if (!fs.existsSync(context.globalStorageUri.fsPath)) {
		fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
	}

	// Dosya yoksa oluştur
	if (!fs.existsSync(snippetStoragePath)) {
		fs.writeFileSync(snippetStoragePath, JSON.stringify([]));
	}

	context.subscriptions.push(
		vscode.commands.registerCommand('snippetBuddy.saveSnippet', saveSnippet),
		vscode.commands.registerCommand('snippetBuddy.insertSnippet', insertSnippet),
		vscode.commands.registerCommand('snippetBuddy.listSnippets', listSnippets)
	);
}

async function saveSnippet() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;

	const selection = editor.selection;
	const code = editor.document.getText(selection);
	if (!code) {
		vscode.window.showWarningMessage('Kaydedilecek bir kod seçin.');
		return;
	}

	const language = editor.document.languageId;

	const title = await vscode.window.showInputBox({ prompt: 'Snippet başlığı' });
	if (!title) return;

	const tags = await vscode.window.showInputBox({ prompt: 'Etiketler (virgülle ayrılmış)' }) || '';
	const description = await vscode.window.showInputBox({ prompt: 'Açıklama (isteğe bağlı)' }) || '';

	const newSnippet = {
		title,
		tags: tags.split(',').map((t: string) => t.trim()),
		description,
		code,
		language
	};

	const snippets = getSnippets();
	snippets.push(newSnippet);
	fs.writeFileSync(snippetStoragePath, JSON.stringify(snippets, null, 2));

	vscode.window.showInformationMessage(`Snippet '${title}' kaydedildi.`);
}

function getSnippets() {
	try {
		return JSON.parse(fs.readFileSync(snippetStoragePath, 'utf8'));
	} catch (error: any) {
		vscode.window.showErrorMessage(`Snippet dosyası okunamadı: ${error.message}`);
		return [];
	}
}

async function listSnippets() {
	const snippets = getSnippets();
	if (snippets.length === 0) {
		vscode.window.showInformationMessage("Hiç snippet kaydedilmemiş.");
		return;
	}

	const items = snippets.map((s: any) => {
		const previewLine = s.code.split('\n')[0]?.trim().slice(0, 40) || '(boş)';
		return {
			label: s.title,
			description: previewLine,
			detail: s.description || '',
			snippet: s
		};
	});

	const picked = await vscode.window.showQuickPick(items, {
		placeHolder: 'Bir snippet seçin',
		matchOnDescription: true,
		matchOnDetail: true
	}) as any;

	if (picked && vscode.window.activeTextEditor) {
		vscode.window.activeTextEditor.insertSnippet(new vscode.SnippetString(picked.snippet.code));
	}
}

async function insertSnippet() {
	await listSnippets();
}

export function deactivate() { }
