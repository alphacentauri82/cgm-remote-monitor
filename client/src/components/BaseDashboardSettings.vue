<template>
  <v-dialog v-model="opened" app persistent max-width="600px">
    <v-card tile>
      <v-toolbar dark color="primary">
        <v-btn icon dark @click="closeModal">
          <v-icon>X</v-icon>
        </v-btn>
        <v-toolbar-title>Settings</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>

      <v-card-text>
        <v-layout row justify center>
          <v-flex md12 xs12>
            <v-form>
              <v-stepper>
                <v-stepper-header>
                  <v-stepper-step editable step="1">Dashboard</v-stepper-step>
                  <v-row>
                    <v-col cols="11" class="text-end">
                      <v-btn color="primary" v-on:click="SaveDashBoardSettings()" dark>Save</v-btn>
                    </v-col>
                  </v-row>
                </v-stepper-header>

                <v-stepper-items>
                  <v-stepper-content step="1">
                    <v-radio-group v-model="dashboardSettings.units" label="Units">
                      <v-radio
                        v-for="(unit, index) in settings.dashboard.units"
                        :key="index"
                        :label="unit.name"
                        :value="unit.value"
                      ></v-radio>
                    </v-radio-group>

                    <v-radio-group v-model="dashboardSettings.timeFormat" label="Time Format">
                      <v-radio
                        v-for="(format, index) in settings.dashboard.timeformat"
                        :key="index"
                        :label="format.name"
                        :value="format.value"
                      ></v-radio>
                    </v-radio-group>

                    <v-row>
                      <v-col cols="12">
                        <label>
                          <b>Language</b>
                        </label>
                        <v-select
                          v-model="dashboardSettings.language"
                          :items="settings.dashboard.language"
                          item-text="name"
                          item-value="value"
                          single-line
                        ></v-select>
                      </v-col>
                    </v-row>

                    <v-row>
                      <v-col cols="12">
                        <label>
                          <b>Scale</b>
                        </label>
                        <v-select
                          v-model="dashboardSettings.scale"
                          :items="settings.dashboard.scale"
                          item-text="name"
                          item-value="value"
                          single-line
                        ></v-select>
                      </v-col>
                    </v-row>

                    <v-row>
                      <v-col cols="12">
                        <label>
                          <b>Render Basal</b>
                        </label>
                        <v-select
                          v-model="dashboardSettings.render"
                          :items="settings.dashboard.render"
                          item-text="name"
                          item-value="value"
                          single-line
                        ></v-select>
                      </v-col>
                    </v-row>

                    <v-row>
                      <v-col cols="12">
                        <label>
                          <b>Enabled Alarms</b>
                        </label>
                        <v-flex
                          md12
                          v-for="(alarm, index) in settings.dashboard.alarms"
                          :key="index"
                        >
                          <v-checkbox
                            :label="
                              `${alarm.name} ${
                                !alarm.editable &&
                                dashboardSettings.alarms[alarm.id].value != ''
                                  ? '(' +
                                    dashboardSettings.alarms[alarm.id].value +
                                    ')' +
                                    (dashboardSettings.alarms[alarm.id].value !=
                                    ''
                                      ? ' ' +
                                        dashboardSettings.alarms[alarm.id].value
                                      : '')
                                  : ''
                              }`
                            "
                            v-model="dashboardSettings.alarms[alarm.id].checked"
                          ></v-checkbox>
                          <!--<span v-if="!alarm.editable && alarm.value!=''">( {{ alarm.value }} {{ alarm.scale }} )</span>-->
                          <v-text-field
                            v-if="alarm.editable"
                            :label="alarm.scale"
                            v-model="dashboardSettings.alarms[alarm.id].value"
                            single-line
                            dense
                            outlined
                          ></v-text-field>
                        </v-flex>
                      </v-col>
                    </v-row>

                    <v-row>
                      <v-col cols="12">
                        <label>
                          <b>Night Mode</b>
                        </label>
                        <v-checkbox
                          :label="settings.dashboard.nightMode.name"
                          v-model="dashboardSettings.nightMode"
                        />
                      </v-col>
                    </v-row>

                    <v-row>
                      <v-col cols="12">
                        <label>
                          <b>Edit Mode</b>
                        </label>
                        <v-checkbox
                          :label="settings.dashboard.editMode.name"
                          v-model="dashboardSettings.editMode"
                        />
                      </v-col>
                    </v-row>

                    <v-radio-group v-model="dashboardSettings.showRawbg" label="Show Raw BG Data">
                      <v-radio
                        v-for="(rawbgdata, index) in settings.dashboard
                          .showRawbg"
                        :key="index"
                        :label="rawbgdata.name"
                        :value="rawbgdata.value"
                      ></v-radio>
                    </v-radio-group>

                    <v-row>
                      <v-col cols="12">
                        <v-text-field
                          :label="settings.dashboard.customTitle.name"
                          v-model="dashboardSettings.customTitle"
                        />
                      </v-col>
                    </v-row>

                    <v-radio-group v-model="dashboardSettings.theme" label="Theme">
                      <v-radio
                        v-for="(ittheme, index) in settings.dashboard.theme"
                        :key="index"
                        :label="ittheme.name"
                        :value="ittheme.value"
                      ></v-radio>
                    </v-radio-group>

                    <v-row>
                      <v-col cols="12">
                        <label>
                          <b>Show Plugins</b>
                        </label>
                        <v-flex
                          md12
                          v-for="(plugin, index) in settings.dashboard.plugins"
                          :key="index"
                        >
                          <v-checkbox
                            :label="plugin.name"
                            v-model="dashboardSettings.plugins[plugin.id]"
                          ></v-checkbox>
                        </v-flex>
                      </v-col>
                    </v-row>

                    <v-row>
                      <v-col cols="12">
                        <label>
                          <b>OpenAps</b>
                        </label>
                        <v-checkbox
                          :label="settings.dashboard.openaps.name"
                          v-model="dashboardSettings.openaps"
                        />
                      </v-col>
                    </v-row>

                    <v-row>
                      <v-col cols="12" class="text-end">
                        <v-btn color="primary" v-on:click="SaveDashBoardSettings()" dark>Save</v-btn>
                      </v-col>
                    </v-row>
                  </v-stepper-content>
                </v-stepper-items>
              </v-stepper>
            </v-form>
          </v-flex>
        </v-layout>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: {
    opened: { required: true }
  },
  data() {
    return {
      units: null,
      dateformat: null,
      language: null,
      //dashboardSettings store the user selected values
      dashboardSettings: '',
      //the settings variable defines all the info necesary for ui form creation
      settings: {
        dashboard: {
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
            { name: 'Spanish', value: 'es' }
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
            { id:'uha', name: 'Urgent High Alarm', checked: true, scale:'', value:'240', editable:false },
            { id:'ha', name: 'High alarm', checked: true, scale:'', value:'180', editable:false },
            { id:'la', name: 'Low alarm', checked: true, scale:'', value:'80', editable:false },
            { id:'ula', name: 'Urgent Low alarm', checked: true, scale:'', value:'65', editable:false },
            { id:'sdw', name: 'Stale Data: Warn', checked: true, scale:'mins', value:'15', editable:true },
            { id:'sdu', name: 'Stale Data: Urgent', checked: true, scale:'mins', value:'30', editable:true },
            { id:'pbla', name: 'Pump Battery Low Alarm', checked: false, scale:'', value:'', editable:false }
          ],
          nightMode:{ name:"Enable", value:false},
          editMode:{ name:"Enable", value:true},
          showRawbg: [
            { name: 'Never', value: 'never' }, 
            { name: 'Always', value: 'always' }, 
            {name: 'When there is noise', value:'noise' }
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
        }
      },
      //selected theme option
      theme: '1'
    }
  },
  created(){
    this.$store.commit('RETRIEVE_SETTINGS');
    this.dashboardSettings = this.$store.state.settings;
    //console.log(this.dashboardSettings);
  },
  mounted(){
    this.dashboardSettings = this.$store.state.settings;
  },
  methods: {
    closeModal() {
      //this.opened = false
      this.$emit('updset')
    },
    SaveDashBoardSettings() {
      //this.$store.commit('setSettings', this.dashboardSettings)
      this.$store.commit('UPDATE_SETTINGS', this.dashboardSettings)
      this.closeModal()
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
