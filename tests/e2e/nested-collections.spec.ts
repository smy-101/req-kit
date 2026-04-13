import { test, expect } from './fixtures';
import { uniqueId } from './helpers/wait';
import { CollectionPage } from './pages/collection-page';

/**
 * 嵌套集合测试
 *
 * 注意：当前 UI 没有创建子集合的功能（新建集合对话框无 parent_id 选择器）。
 * 通过 API 创建的子集合需要手动刷新页面才能在树中显示。
 * 以下测试标记为 fixme，待 UI 支持嵌套集合后启用。
 */
test.describe('嵌套集合', () => {
  test.fixme('创建子集合并验证嵌套渲染', async ({ page }) => {
    const coll = new CollectionPage(page);
    const parentName = uniqueId('父集合_');
    const childName = uniqueId('子集合_');

    await coll.createCollection(parentName);
    await coll.createNestedCollection(parentName, childName);

    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: childName })).toBeVisible();
  });

  test.fixme('子集合缩进大于父集合', async ({ page }) => {
    const coll = new CollectionPage(page);
    const parentName = uniqueId('父集合缩进_');
    const childName = uniqueId('子集合缩进_');

    await coll.createCollection(parentName);
    await coll.createNestedCollection(parentName, childName);

    const parentItem = page.locator('#collection-tree .tree-item').filter({ hasText: parentName });
    const childItem = page.locator('#collection-tree .tree-item').filter({ hasText: childName });

    const parentPadding = await parentItem.evaluate(el => el.style.paddingLeft);
    const childPadding = await childItem.evaluate(el => el.style.paddingLeft);

    expect(parseInt(childPadding)).toBeGreaterThan(parseInt(parentPadding));
  });

  test.fixme('删除父集合并联删除子集合', async ({ page }) => {
    const coll = new CollectionPage(page);
    const parentName = uniqueId('父集合删除_');
    const childName = uniqueId('子集合删除_');

    await coll.createCollection(parentName);
    await coll.createNestedCollection(parentName, childName);

    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: childName })).toBeVisible();

    await coll.deleteCollection(parentName);

    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: childName })).not.toBeVisible();
  });
});
