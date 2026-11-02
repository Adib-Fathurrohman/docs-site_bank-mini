/*
 * Sätteri hast plugin: wraps every Markdown table in <div class="table-wrap">.
 * The wrapper scrolls sideways on narrow screens, so the table itself can stay
 * a real table that fills the content width (Starlight's default makes the
 * table display:block, which shrinks it to its content).
 */
export const tableWrap = {
	name: 'bank-mini-table-wrap',
	element: [
		{
			filter: ['table'],
			visit(node, ctx) {
				ctx.wrapNode(node, {
					type: 'element',
					tagName: 'div',
					properties: { className: ['table-wrap'] },
					children: [],
				});
			},
		},
	],
};
