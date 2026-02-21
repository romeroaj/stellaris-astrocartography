import SwiftUI

struct ProfileTabView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var profileManager: ProfileManager
    @State private var showEditBirthData = false

    var body: some View {
        ZStack {
            ParanTheme.background.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 20) {
                    profileHeader
                    birthDataSection
                    settingsSection
                    accountSection
                }
                .padding(.horizontal)
                .padding(.top, 60)
                .padding(.bottom, 100)
            }
        }
        .sheet(isPresented: $showEditBirthData) {
            EditBirthDataSheet()
                .environmentObject(profileManager)
        }
    }

    private var profileHeader: some View {
        VStack(spacing: 12) {
            Circle()
                .fill(ParanTheme.accent.opacity(0.2))
                .frame(width: 80, height: 80)
                .overlay {
                    if let name = profileManager.activeProfile?.name {
                        Text(String(name.prefix(1)).uppercased())
                            .font(.system(size: 32, weight: .bold))
                            .foregroundStyle(ParanTheme.accent)
                    } else {
                        Image(systemName: "person.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(ParanTheme.accent)
                    }
                }

            Text(profileManager.activeProfile?.name ?? "Set Up Profile")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(ParanTheme.textPrimary)

            if authManager.isLoggedIn, let user = authManager.user {
                Text(user.displayName)
                    .font(.system(size: 14))
                    .foregroundStyle(ParanTheme.textSecondary)
            }
        }
    }

    private var birthDataSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Birth Data", icon: "calendar")

            if let profile = profileManager.activeProfile {
                VStack(alignment: .leading, spacing: 8) {
                    ProfileRow(label: "Date", value: profile.dateOfBirth.formatted(date: .abbreviated, time: .shortened))
                    ProfileRow(label: "Location", value: profile.locationName)
                }
                .padding(14)
                .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 14))

                Button {
                    showEditBirthData = true
                } label: {
                    Text("Edit Birth Data")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(ParanTheme.accent)
                }
            } else {
                Button {
                    showEditBirthData = true
                } label: {
                    Text("Enter Birth Data")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(ParanTheme.background)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(ParanTheme.accent, in: RoundedRectangle(cornerRadius: 14))
                }
            }
        }
    }

    private var settingsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Settings", icon: "gearshape.fill")

            VStack(spacing: 0) {
                Toggle(isOn: $profileManager.settings.includeMinorPlanets) {
                    Text("Include Minor Planets")
                        .font(.system(size: 14))
                        .foregroundStyle(ParanTheme.textPrimary)
                }
                .tint(ParanTheme.accent)
                .padding(14)

                Divider().background(ParanTheme.cardBorder)

                Toggle(isOn: $profileManager.settings.hideMildImpacts) {
                    Text("Hide Mild Impacts")
                        .font(.system(size: 14))
                        .foregroundStyle(ParanTheme.textPrimary)
                }
                .tint(ParanTheme.accent)
                .padding(14)
            }
            .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 14))
            .onChange(of: profileManager.settings.includeMinorPlanets) { _ in profileManager.saveSettings() }
            .onChange(of: profileManager.settings.hideMildImpacts) { _ in profileManager.saveSettings() }
        }
    }

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Account", icon: "person.circle")

            if authManager.isLoggedIn {
                Button {
                    authManager.logout()
                } label: {
                    Text("Sign Out")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(ParanTheme.difficult)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(ParanTheme.difficult.opacity(0.1), in: RoundedRectangle(cornerRadius: 14))
                }
            } else {
                Text("Sign in to sync your data across devices.")
                    .font(.system(size: 13))
                    .foregroundStyle(ParanTheme.textSecondary)
            }
        }
    }
}

struct ProfileRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(ParanTheme.textSecondary)
            Spacer()
            Text(value)
                .font(.system(size: 13))
                .foregroundStyle(ParanTheme.textPrimary)
        }
    }
}

struct EditBirthDataSheet: View {
    @EnvironmentObject var profileManager: ProfileManager
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var dateOfBirth = Date()
    @State private var locationName = ""
    @State private var latitude = ""
    @State private var longitude = ""

    var body: some View {
        NavigationStack {
            ZStack {
                ParanTheme.background.ignoresSafeArea()

                VStack(spacing: 20) {
                    TextField("Your Name", text: $name)
                        .textFieldStyle(.plain)
                        .padding()
                        .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 12))

                    DatePicker("Date & Time of Birth", selection: $dateOfBirth, displayedComponents: [.date, .hourAndMinute])
                        .datePickerStyle(.compact)
                        .tint(ParanTheme.accent)

                    TextField("Birth City", text: $locationName)
                        .textFieldStyle(.plain)
                        .padding()
                        .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 12))

                    HStack(spacing: 12) {
                        TextField("Latitude", text: $latitude)
                            .textFieldStyle(.plain)
                            .keyboardType(.decimalPad)
                            .padding()
                            .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 12))
                        TextField("Longitude", text: $longitude)
                            .textFieldStyle(.plain)
                            .keyboardType(.decimalPad)
                            .padding()
                            .background(ParanTheme.surface, in: RoundedRectangle(cornerRadius: 12))
                    }

                    Button {
                        let profile = BirthData(
                            name: name,
                            dateOfBirth: dateOfBirth,
                            latitude: Double(latitude) ?? 0,
                            longitude: Double(longitude) ?? 0,
                            locationName: locationName
                        )
                        profileManager.saveProfile(profile)
                        dismiss()
                    } label: {
                        Text("Save")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(ParanTheme.background)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(ParanTheme.accent, in: RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(name.isEmpty)

                    Spacer()
                }
                .padding()
                .foregroundStyle(ParanTheme.textPrimary)
            }
            .navigationTitle("Birth Data")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(ParanTheme.textSecondary)
                }
            }
            .onAppear {
                if let profile = profileManager.activeProfile {
                    name = profile.name
                    dateOfBirth = profile.dateOfBirth
                    locationName = profile.locationName
                    latitude = String(profile.latitude)
                    longitude = String(profile.longitude)
                }
            }
        }
    }
}
