import { test, expect } from './fixtures';
import { uniqueId } from './helpers/wait';
import { CollectionPage } from './pages/collection-page';

test.describe('嵌套集合', () => {
  test('创建子集合并验证嵌套渲染', async ({ page }) => {
    await page.goto('/');
    const coll = new CollectionPage(page);
    const parentName = uniqueId('父集合_');
    const childName = uniqueId('子集合_');

    await coll.createCollection(parentName);
    await coll.createNestedCollection(parentName, childName);

    await expect(page.locator('#collection-tree .tree-item').filter({ hasText: childName })).toBeVisible();
  });

  test('子集合缩进大于父集合', async ({ page }) => {
    await page.goto('/');
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

  test('删除父集合并联删除子集合', async ({ page }) => {
    await page.goto('/');
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
