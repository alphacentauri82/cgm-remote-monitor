<template>
  <v-dialog
    v-model="isOpen"
    fullscreen
    hide-overlay
    scrollable
    transition="dialog-bottom-transition"
  >
    <v-card tile>
      <v-toolbar dark>
        <v-btn icon dark @click="closeModal">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>Settings</v-toolbar-title>
        <v-spacer></v-spacer>

        <v-toolbar-items>
          <v-btn text @click="SaveDashBoardSettings">Save</v-btn>
        </v-toolbar-items>
      </v-toolbar>

      <v-card-text>
        <v-form>
          <v-tabs class="mt-1" v-model="selectedTab" grow show-arrows>
            <v-tabs-slider></v-tabs-slider>

            <v-tab :href="`#tab-general`">General</v-tab>
            <v-tab :href="`#tab-alarms`">Alarms</v-tab>
            <v-tab :href="`#tab-theme`">Theme</v-tab>
            <v-tab :href="`#tab-plugins`">Plugins</v-tab>

            <v-tab-item value="tab-general">
              <v-card flat tile>
                <v-card-text>
                  <!-- Units -->
                  <v-radio-group v-model="units" label="Units">
                    <v-radio
                      v-for="(unit, index) in presets.units"
                      :key="index"
                      :label="unit.name"
                      :value="unit.value"
                    ></v-radio>
                  </v-radio-group>

                  <!-- Time Format -->
                  <v-radio-group v-model="timeFormat" label="Time Format">
                    <v-radio
                      v-for="(format, index) in presets.timeformat"
                      :key="index"
                      :label="format.name"
                      :value="format.value"
                    ></v-radio>
                  </v-radio-group>

                  <!-- Language -->
                  <v-row>
                    <v-col cols="12">
                      <v-select
                        label="Language"
                        v-model="language"
                        :items="presets.language"
                        item-text="name"
                        item-value="value"
                        single-line
                      ></v-select>
                    </v-col>
                  </v-row>

                  <!-- Scale -->
                  <v-row>
                    <v-col cols="12">
                      <v-select
                        label="Scale"
                        v-model="scale"
                        :items="presets.scale"
                        item-text="name"
                        item-value="value"
                        single-line
                      ></v-select>
                    </v-col>

                    <!-- Basal -->
                    <v-row>
                      <v-col cols="12">
                        <label>
                          <b>Render Basal</b>
                        </label>
                        <v-select
                          v-model="render"
                          :items="presets.render"
                          item-text="name"
                          item-value="value"
                          single-line
                        ></v-select>
                      </v-col>
                    </v-row>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-tab-item>
            <v-tab-item value="tab-alarms">
              <v-card tile flat>
                <v-card-text>
                  <v-flex
                    md12
                    v-for="(alarm, index) in presets.alarms"
                    :key="index"
                  >
                    <v-checkbox
                      :label="alarmLabel(alarm)"
                      v-model="changedValues.alarms[alarm.id].checked"
                    ></v-checkbox>

                    <v-text-field
                      v-if="alarm.editable"
                      :label="alarm.scale"
                      v-model="changedValues.alarms[alarm.id].value"
                      single-line
                      dense
                      outlined
                    ></v-text-field>
                  </v-flex>
                </v-card-text>
              </v-card>
            </v-tab-item>
            <v-tab-item value="tab-theme">
              <v-card flat tile>
                <v-card-text>
                  <v-row>
                    <v-col cols="12">
                      <label>
                        <b>Night Mode</b>
                      </label>
                      <v-checkbox
                        :label="presets.nightMode.name"
                        v-model="changedValues.nightMode"
                      />
                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col cols="12">
                      <label>
                        <b>Edit Mode</b>
                      </label>
                      <v-checkbox
                        :label="presets.editMode.name"
                        v-model="changedValues.editMode"
                      />
                    </v-col>
                  </v-row>

                  <v-radio-group
                    v-model="changedValues.showRawbg"
                    label="Show Raw BG Data"
                  >
                    <v-radio
                      v-for="(rawbgdata, index) in presets.showRawbg"
                      :key="index"
                      :label="rawbgdata.name"
                      :value="rawbgdata.value"
                    ></v-radio>
                  </v-radio-group>

                  <v-row>
                    <v-col cols="12">
                      <v-text-field
                        :label="presets.customTitle.name"
                        v-model="customTitle"
                      />
                    </v-col>
                  </v-row>

                  <v-radio-group v-model="changedValues.theme" label="Theme">
                    <v-radio
                      v-for="(ittheme, index) in presets.theme"
                      :key="index"
                      :label="ittheme.name"
                      :value="ittheme.value"
                    ></v-radio>
                  </v-radio-group>
                </v-card-text>
              </v-card>
            </v-tab-item>
            <v-tab-item value="tab-plugins">
              <v-card flat tile>
                <v-card-text>
                  <v-row>
                    <v-col cols="12">
                      <div
                        v-for="(plugin, index) in presets.plugins"
                        :key="index"
                      >
                        <v-checkbox
                          :label="plugin.name"
                          v-model="changedValues.plugins[plugin.id]"
                        ></v-checkbox>
                      </div>
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col cols="12">
                      <label>
                        <b>OpenAps</b>
                      </label>
                      <v-checkbox
                        :label="presets.openaps.name"
                        v-model="dashboardSettings.openaps"
                      />
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-tab-item>
          </v-tabs>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapState } from 'vuex'

export default {
  data() {
    return {
      isOpen: true,
      selectedTab: null,
      changedValues: {},
      //the settings variable defines all the info necesary for ui form creation
      presets: {
        units: [
          { name: 'mg/dL', value: 'mg/dL' },
          { name: 'mmol/L', value: 'mmol/L' }
        ],
        timeformat: [
          { name: '12 Hours', value: '12' },
          { name: '24 Hours', value: '24' }
        ],
        language: [
          { name: 'English', value: 'en' },
          { name: 'Español', value: 'es' },
          { name: 'Deutsch', value: 'de' },
          { name: 'Français', value: 'fr' },
          { name: 'Italiano', value: 'it' },
          { name: 'Nederlands', value: 'nl' },
          { name: 'Português (Brasil)', value: 'pt' },
          { name: 'Română', value: 'ro' },
          { name: 'Русский', value: 'ru' },
          { name: 'Български', value: 'bg' },
          { name: 'Čeština', value: 'cs' },
          { name: 'Dansk', value: 'dk' },
          { name: 'Ελληνικά', value: 'el' },
          { name: 'Suomi', value: 'fi' },
          { name: 'Hrvatski', value: 'hr' },
          { name: 'Norsk (Bokmål)', value: 'nb' },
          { name: 'Polski', value: 'pl' },
          { name: 'Slovenčina', value: 'sk' },
          { name: 'Svenska', value: 'sv' },
          { name: 'Türkçe', value: 'tr' }
        ],
        scale: [
          { name: 'Logarithmic', value: 'log' },
          { name: 'Another scale', value: 'another' }
        ],
        render: [
          { name: 'Default', value: 'default' },
          { name: 'Icicle', value: 'icicle' }
        ],
        alarms: [
          {
            id: 'uha',
            name: 'Urgent High Alarm',
            checked: true,
            scale: '',
            value: '240',
            editable: false
          },
          {
            id: 'ha',
            name: 'High alarm',
            checked: true,
            scale: '',
            value: '180',
            editable: false
          },
          {
            id: 'la',
            name: 'Low alarm',
            checked: true,
            scale: '',
            value: '80',
            editable: false
          },
          {
            id: 'ula',
            name: 'Urgent Low alarm',
            checked: true,
            scale: '',
            value: '65',
            editable: false
          },
          {
            id: 'sdw',
            name: 'Stale Data: Warn',
            checked: true,
            scale: 'mins',
            value: '15',
            editable: true
          },
          {
            id: 'sdu',
            name: 'Stale Data: Urgent',
            checked: true,
            scale: 'mins',
            value: '30',
            editable: true
          },
          {
            id: 'pbla',
            name: 'Pump Battery Low Alarm',
            checked: false,
            scale: '',
            value: '',
            editable: false
          }
        ],
        nightMode: { name: 'Enable', value: false },
        editMode: { name: 'Enable', value: true },
        showRawbg: [
          { name: 'Never', value: 'never' },
          { name: 'Always', value: 'always' },
          { name: 'When there is noise', value: 'noise' }
        ],
        customTitle: {
          name: 'Custom title',
          value: '',
          placeholder: 'Edit title'
        },
        // Themes option
        theme: [
          { name: 'Default', value: 'default' },
          { name: 'Colors', value: 'colors' },
          { name: 'Colorblind-friendly colors', value: 'colorblind-friendly' }
        ],
        plugins: [
          { name: 'Insulin-on-Board', id: 'insulin' },
          { name: 'Carbs-on-Board', id: 'carbs' },
          { name: 'Care Portal', id: 'care-port' },
          { name: 'Pump', id: 'pump' },
          { name: 'OpenAPS', id: 'openaps' },
          { name: 'Cannula Age', id: 'cannula' },
          { name: 'Sensor Age', id: 'sensor-age' },
          { name: 'Insulin Age', id: 'insulin-age' },
          { name: 'Pump Battery change', id: 'pump-battery-change' },
          { name: 'Basal Profile', id: 'basal-profile' },
          { name: 'Bolus Wizard', id: 'bolus-wizard' },
          { name: 'Speech', id: 'speech' }
        ],
        openaps: { name: 'Color prediction lines', value: false }
      },
      //selected theme option
      theme: '1'
    }
  },
  async created() {
    this.$store.dispatch('settings/retrieveSettings')

    this.changedValues = {
      alarms: this.dashboardSettings.alarms,
      nightMode: this.dashboardSettings.nightMode,
      editMode: this.dashboardSettings.editMode,
      showRawbg: this.dashboardSettings.showRawbg,
      theme: this.dashboardSettings.theme,
      plugins: this.dashboardSettings.plugins,
      openaps: this.dashboardSettings.openaps
    }
  },
  computed: {
    units: {
      get: function() {
        return this.dashboardSettings.units
      },
      set: function(value) {
        this.changedValues.units = value
      }
    },
    timeFormat: {
      get: function() {
        return this.dashboardSettings.timeFormat
      },
      set: function(value) {
        this.changedValues.timeFormat = value
      }
    },
    language: {
      get: function() {
        return this.dashboardSettings.language
      },
      set: function(value) {
        this.changedValues.language = value
      }
    },
    scale: {
      get: function() {
        return this.dashboardSettings.scale
      },
      set: function(value) {
        this.changedValues.scale = value
      }
    },
    render: {
      get: function() {
        return this.dashboardSettings.render
      },
      set: function(value) {
        this.changedValues.render = value
      }
    },
    customTitle: {
      get: function() {
        return this.dashboardSettings.customTitle
      },
      set: function(value) {
        this.changedValues.customTitle = value
      }
    },
    ...mapState({
      dashboardSettings: state => state.settings
    })
  },
  methods: {
    /**
     * closes the modal and redirect to home
     */
    closeModal() {
      this.isOpen = false
      // redirect to home page after close the modal
      setTimeout(() => {
        this.$router.push({ name: 'home' })
      }, 130)
    },
    /**
     * format the label for Alarms
     */
    alarmLabel(alarm) {
      let label = `${alarm.name} `
      const alarmValue = this.dashboardSettings.alarms[alarm.id].value

      if (!alarm.editable && alarmValue) {
        label = `${label} (${alarmValue}) ${alarmValue}`
      } else {
        label = `${label} ${alarmValue}`
      }

      return label
    },
    SaveDashBoardSettings() {
      // merging the original values with the edited values
      let toStore = { ...this.dashboardSettings, ...this.changedValues }

      //Load selected language
      this.$i18n.setLocaleMessage('lang',require('@/lang/'+toStore.language+'.json'));
      this.$i18n.locale = 'lang';

      // sending to save
      this.$store.dispatch('settings/updateSettings', toStore).then(() => {
        console.log('Settings updated')
        // and execute the modal close
        this.closeModal()
      })
    }
  }
}
</script>
<style>
.v-stepper {
  box-shadow: none !important;
  border-radius: 0px !important;
  position: unset !important;
}
</style>
