const fs = require('fs');

const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const hierarchyFactory = require('@factories/cht/generate');

const readFormDocument = (formId) => {
  const form = fs.readFileSync(`${__dirname}/forms/${formId}.xml`, 'utf8');
  const formDocument = {
    _id: `form:${formId}`,
    internalId: formId,
    title: `Form ${formId}`,
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(form).toString('base64')
      }
    }
  };
  return formDocument;
};

const assertLabels = async ({ selector, count, labelText }) => {
  const labels = await $$(selector);
  expect(labels.length).to.equal(count);
  for (const label of labels) {
    expect(await label.getText()).to.equal(labelText);
  }
};

const openRepeatForm = async (formId) => {
  await commonPage.goToReports();
  await commonPage.openFastActionReport(formId, false);
};

const getField = async (fieldName, fieldValue) => {
  const fieldInputPath = `#report-form input[name="/cascading_select/${fieldName}"][value="${fieldValue}"]`;
  const fieldLabelPath = `${fieldInputPath} ~ .option-label.active`;

  return {
    input: await $(fieldInputPath),
    label: await $(fieldLabelPath),
  };
};

const countFormDocument = readFormDocument('repeat-translation-count');
const buttonFormDocument = readFormDocument('repeat-translation-button');
const selectFormDocument = readFormDocument('repeat-translation-select');

const hierarchy = hierarchyFactory.createHierarchy({ name: 'test', user: true, nbrClinics: 1, nbrPersons: 1 });

describe('RepeatForm', () => {
  before(async () => {
    await utils.saveDocs(hierarchy.places);
    await utils.createUsers([hierarchy.user]);
    await utils.saveDocs([countFormDocument, buttonFormDocument, selectFormDocument]);
  });

  afterEach(async () => {
    await browser.deleteCookies();
    await browser.refresh();
  });

  const selectorPrefix = '#report-form .active';
  const stateLabelPath = `${selectorPrefix}.question-label[data-itext-id="/repeat_translation/basic/state_1:label"]`;
  const cityLabelPath = `${selectorPrefix}.question-label[data-itext-id="/repeat_translation/basic/rep/city_1:label"]`;
  const melbourneLabelPath = `${selectorPrefix}[data-itext-id="/repeat_translation/basic/rep/city_1/melbourne:label"]`;

  describe('Repeat form with count input', () => {
    const inputCountPath = `${selectorPrefix}[data-itext-id="/repeat_translation/basic/count:label"] ~ input`;
    const repeatForm = async (count) => {
      const inputCount = await $(inputCountPath);
      await inputCount.setValue(count);
      const stateLabel = await $(stateLabelPath);
      await stateLabel.click(); // trigger a blur event to trigger the enketo form change listener
      expect(await inputCount.getValue()).to.equal(count.toString());
    };

    it('should display the initial form and its repeated content in Nepali', async () => {
      const neUserName = 'प्रयोगकर्ताको नाम';
      await loginPage.changeLanguage('ne', neUserName);
      await loginPage.login(hierarchy.user);
      await openRepeatForm(countFormDocument.internalId);

      const stateLabel = await $(stateLabelPath);
      expect(await stateLabel.getText()).to.equal('Select a state: - NE');
      const inputCount = await $(inputCountPath);
      expect(await inputCount.getValue()).to.equal('1');
      await assertLabels({ selector: cityLabelPath, count: 1, labelText: 'Select a city: - NE' });
      await assertLabels({ selector: melbourneLabelPath, count: 1, labelText: 'ML (NE)' });

      await repeatForm(3);

      await assertLabels({ selector: cityLabelPath, count: 3, labelText: 'Select a city: - NE' });
      await assertLabels({ selector: melbourneLabelPath, count: 3, labelText: 'ML (NE)' });
    });

    it('should display the initial form and its repeated content in English', async () => {
      const enUserName = 'User name';
      await loginPage.changeLanguage('en', enUserName);
      await loginPage.login(hierarchy.user);
      await openRepeatForm(countFormDocument.internalId);

      const stateLabel = await $(stateLabelPath);
      expect(await stateLabel.getText()).to.equal('Select a state:');
      const inputCount = await $(inputCountPath);
      expect(await inputCount.getValue()).to.equal('1');
      await assertLabels({ selector: cityLabelPath, count: 1, labelText: 'Select a city:' });
      await assertLabels({ selector: melbourneLabelPath, count: 1, labelText: 'Melbourne' });

      await repeatForm(3);

      await assertLabels({ selector: cityLabelPath, count: 3, labelText: 'Select a city:' });
      await assertLabels({ selector: melbourneLabelPath, count: 3, labelText: 'Melbourne' });
    });
  });

  describe('Repeat form with repeat button', () => {
    const repeatForm = async () => {
      const addRepeatButton = await $('.btn.btn-default.add-repeat-btn');
      await addRepeatButton.click();
    };

    it('should display the initial form and its repeated content in Swahili', async () => {
      const swUserName = 'Jina la mtumizi';
      await loginPage.changeLanguage('sw', swUserName);
      await loginPage.login(hierarchy.user);
      await openRepeatForm(buttonFormDocument.internalId);

      const stateLabel = await $(stateLabelPath);
      expect(await stateLabel.getText()).to.equal('Select a state: - SV');
      await assertLabels({ selector: cityLabelPath, count: 0, labelText: 'Select a city: - SV' });
      await assertLabels({ selector: melbourneLabelPath, count: 0, labelText: 'ML (SV)' });

      await repeatForm();
      await repeatForm();
      await repeatForm();

      await assertLabels({ selector: cityLabelPath, count: 3, labelText: 'Select a city: - SV' });
      await assertLabels({ selector: melbourneLabelPath, count: 3, labelText: 'ML (SV)' });
    });

    it('should display the initial form and its repeated content in English', async () => {
      const enUserName = 'User name';
      await loginPage.changeLanguage('en', enUserName);
      await loginPage.login(hierarchy.user);
      await openRepeatForm(buttonFormDocument.internalId);

      const stateLabel = await $(stateLabelPath);
      expect(await stateLabel.getText()).to.equal('Select a state:');
      await assertLabels({ selector: cityLabelPath, count: 0, labelText: 'Select a city:' });
      await assertLabels({ selector: melbourneLabelPath, count: 0, labelText: 'Melbourne' });

      await repeatForm();
      await repeatForm();
      await repeatForm();

      await assertLabels({ selector: cityLabelPath, count: 3, labelText: 'Select a city:' });
      await assertLabels({ selector: melbourneLabelPath, count: 3, labelText: 'Melbourne' });
    });
  });

  describe('Repeat form with select', () => {
    it('should display the initial form and its repeated content in the default language', async () => {
      const swUserName = 'Jina la mtumizi';
      await loginPage.changeLanguage('sw', swUserName);
      await loginPage.login(hierarchy.user);
      await openRepeatForm(selectFormDocument.internalId);

      const { input: washingtonInput, label: washingtonLabel } = await getField('selected_state', 'washington');
      expect(await washingtonLabel.getText()).to.equal('Washington');

      await washingtonInput.click();
      const { input: kingInput, label: kingLabel } = await getField('selected_county', 'king');
      expect(await kingLabel.getText()).to.equal('King');

      await kingInput.click();
      const { label: seattleLabel } = await getField('selected_city', 'seattle');
      const { label: redmondLabel } = await getField('selected_city', 'redmond');
      expect(await seattleLabel.getText()).to.equal('Seattle');
      expect(await redmondLabel.getText()).to.equal('Redmond');
    });
  });
});
